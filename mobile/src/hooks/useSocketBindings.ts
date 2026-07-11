import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  ensureSocketConnected,
  getSocket,
  registerSessionRestore,
  SOCKET_EVENTS,
  emitAck,
} from '../services/socket';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { queryClient } from '../queryClient';
import { navigateToActiveRoom, navigateToLobby } from '../navigation/navigationRef';
import type { PrivateGameSnapshot, Room } from '../models/types';
import {
  armRoomClosedGuards,
  clearRoomSyncGuards,
  shouldIgnoreRoomUpdate,
  shouldSuppressGameSnapshots,
  tryClearSuppressForLobbyPhase,
} from '../utils/roomSyncGuards';

function isInGamePhase(phase: string | undefined): boolean {
  return !!phase && phase !== 'waiting' && phase !== 'countdown' && phase !== 'finished';
}

const REASON_MS = 2000;
const RESHUFFLE_LABEL_MS = 800;
const SHUFFLE_MS = 2000;
const SCOREBOARD_DISMISS_MS = 500;
const TRICK_HOLD_MS = 1300;

let trickHoldTimer: ReturnType<typeof setTimeout> | null = null;
let overlayTimers: ReturnType<typeof setTimeout>[] = [];
let reshuffleSequenceActive = false;
let lastReshuffleEpoch = 0;
let deferRoundShuffle = false;
let roundShuffleInProgress = false;

function clearOverlayTimers() {
  overlayTimers.forEach(clearTimeout);
  overlayTimers = [];
}

function scheduleOverlay(ms: number, fn: () => void) {
  const id = setTimeout(fn, ms);
  overlayTimers.push(id);
}

function isOverlayActive() {
  const s = useGameStore.getState();
  return reshuffleSequenceActive || s.hideHand || s.tableOverlay !== null;
}

function trickAnimationActive() {
  const s = useGameStore.getState();
  return !!s.heldTrick || !!s.trickCollect;
}

export function flushTrickDeferredSnapshot() {
  const { pendingSnapshot, setPendingSnapshot, setSnapshot } = useGameStore.getState();
  if (trickAnimationActive()) return;
  if (!pendingSnapshot) return;
  if (pendingSnapshot.phase === 'scoreboard' || pendingSnapshot.phase === 'finished') {
    setSnapshot(pendingSnapshot);
    setPendingSnapshot(null);
  }
}

function queueOrApplySnapshot(snap: PrivateGameSnapshot) {
  const prevPhase = useGameStore.getState().snapshot?.phase;
  const leavingScoreboard = prevPhase === 'scoreboard' && snap.phase !== 'scoreboard';

  if (snap.phase === 'scoreboard' || snap.phase === 'finished') {
    if (trickAnimationActive()) {
      useGameStore.getState().setPendingSnapshot(snap);
      return;
    }
    if (trickHoldTimer) {
      clearTimeout(trickHoldTimer);
      trickHoldTimer = null;
    }
    useGameStore.getState().setHeldTrick(null);
    useGameStore.getState().setTrickCollect(null);
    if (prevPhase !== 'scoreboard') {
      deferRoundShuffle = false;
    }
  }

  if (leavingScoreboard || deferRoundShuffle) {
    beginRoundShuffle(snap);
    return;
  }

  if (isOverlayActive()) {
    useGameStore.getState().setPendingSnapshot(snap);
    return;
  }
  useGameStore.getState().setSnapshot(snap);
}

function finishOverlaySequence() {
  reshuffleSequenceActive = false;
  roundShuffleInProgress = false;
  const { pendingSnapshot, setPendingSnapshot, setSnapshot, setTableOverlay, setHideHand, room } =
    useGameStore.getState();
  if (pendingSnapshot) {
    const snap =
      room?.suspendApprovals !== undefined
        ? { ...pendingSnapshot, suspendApprovals: [...room.suspendApprovals] }
        : pendingSnapshot;
    setSnapshot(snap);
    setPendingSnapshot(null);
  }
  setTableOverlay(null);
  setHideHand(false);
}

function startShuffleSequence() {
  if (reshuffleSequenceActive) return;

  clearOverlayTimers();
  const { setTableOverlay, setHideHand } = useGameStore.getState();
  setTableOverlay('Shuffling…');
  setHideHand(true);

  scheduleOverlay(SHUFFLE_MS, finishOverlaySequence);
}

function beginRoundShuffle(snap: PrivateGameSnapshot) {
  deferRoundShuffle = false;
  roundShuffleInProgress = true;
  useGameStore.getState().setSnapshot(snap);
  useGameStore.getState().setHideHand(true);
  useGameStore.getState().setTableOverlay(null);

  scheduleOverlay(SCOREBOARD_DISMISS_MS, () => {
    useGameStore.getState().setPendingSnapshot(snap);
    startShuffleSequence();
  });
}

function startReshuffleSequence(displayMessage?: string) {
  clearOverlayTimers();
  reshuffleSequenceActive = true;

  const { setTableOverlay, setHideHand } = useGameStore.getState();
  const reason = displayMessage?.trim();

  if (reason) {
    setHideHand(false);
    setTableOverlay(reason);

    scheduleOverlay(REASON_MS, () => {
      setTableOverlay('Reshuffle');
      setHideHand(true);
    });

    scheduleOverlay(REASON_MS + RESHUFFLE_LABEL_MS, () => {
      setTableOverlay('Shuffling…');
    });

    scheduleOverlay(REASON_MS + RESHUFFLE_LABEL_MS + SHUFFLE_MS, finishOverlaySequence);
    return;
  }

  setTableOverlay('Reshuffle');
  setHideHand(true);

  scheduleOverlay(RESHUFFLE_LABEL_MS, () => {
    setTableOverlay('Shuffling…');
  });

  scheduleOverlay(RESHUFFLE_LABEL_MS + SHUFFLE_MS, finishOverlaySequence);
}

export function useSocketBindings() {
  const user = useAuthStore((s) => s.user);
  const setRoom = useGameStore((s) => s.setRoom);
  const setSnapshot = useGameStore((s) => s.setSnapshot);
  const setCountdown = useGameStore((s) => s.setCountdown);
  const setChat = useGameStore((s) => s.setChat);
  const pushChat = useGameStore((s) => s.pushChat);
  const setError = useGameStore((s) => s.setError);
  const setSocketConnected = useGameStore((s) => s.setSocketConnected);
  const setTrickCollect = useGameStore((s) => s.setTrickCollect);
  const setHeldTrick = useGameStore((s) => s.setHeldTrick);
  const setTableOverlay = useGameStore((s) => s.setTableOverlay);
  const setHideHand = useGameStore((s) => s.setHideHand);
  const setPendingSnapshot = useGameStore((s) => s.setPendingSnapshot);
  const applySuspendApprovals = useGameStore((s) => s.applySuspendApprovals);

  useEffect(() => {
    if (!user) {
      setSocketConnected(false);
      return;
    }

    let mounted = true;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const bindListeners = (socket: ReturnType<typeof getSocket>) => {
      if (!socket) return () => undefined;

      const onRoom = (data: Room & { snapshot?: PrivateGameSnapshot }) => {
        if (shouldIgnoreRoomUpdate(data.id)) return;

        if (shouldSuppressGameSnapshots()) {
          if (!data.id) return;
          tryClearSuppressForLobbyPhase(data.phase);
          if (shouldSuppressGameSnapshots()) {
            return;
          }
        }

        const prevRoom = useGameStore.getState().room;
        const wasEmpty = !prevRoom?.id;
        const wasLobby =
          prevRoom?.phase === 'waiting' || prevRoom?.phase === 'countdown' || !prevRoom?.phase;

        setRoom(data);
        if (data.phase === 'countdown' && data.countdownRemaining !== undefined) {
          setCountdown(data.countdownRemaining);
        }
        if (data.suspendApprovals !== undefined) {
          applySuspendApprovals(data.suspendApprovals);
        }
        if (data.phase !== 'waiting') setError(null);
        if (isInGamePhase(data.phase)) {
          setCountdown(null);
        }
        if (data.snapshot) {
          if (data.snapshot.reshuffleEpoch && data.snapshot.reshuffleEpoch > lastReshuffleEpoch) {
            lastReshuffleEpoch = data.snapshot.reshuffleEpoch;
          }
          queueOrApplySnapshot(data.snapshot);
        }
        if (data.chat) setChat(data.chat);
        if (data.id && (wasEmpty || (wasLobby && isInGamePhase(data.phase)))) {
          navigateToActiveRoom(data);
        }
      };

      const onSuspendUpdated = (payload: {
        suspendApprovals: string[];
        requestedBy?: string;
      }) => {
        applySuspendApprovals(payload.suspendApprovals ?? []);
      };

      const onChat = (msg: {
        userId: string;
        username: string;
        message: string;
        at: number;
      }) => {
        pushChat(msg);
      };

      const onChatHistory = (payload: {
        messages: Array<{ userId: string; username: string; message: string; at: number }>;
      }) => {
        setChat(payload.messages ?? []);
      };

      const onRoomClosed = (payload?: { roomId?: string; reason?: string }) => {
        clearOverlayTimers();
        reshuffleSequenceActive = false;
        lastReshuffleEpoch = 0;
        deferRoundShuffle = false;
        roundShuffleInProgress = false;
        armRoomClosedGuards(payload?.roomId ?? useGameStore.getState().room?.id ?? null);
        const closedRoomId = payload?.roomId ?? null;
        useGameStore.getState().reset();
        navigateToLobby();
        void queryClient.invalidateQueries({ queryKey: ['publicRooms'] });
        setTimeout(() => {
          if (closedRoomId) clearRoomSyncGuards();
        }, 4000);
      };

      const restoreSession = async () => {
        try {
          const res = (await emitAck<{
            success: boolean;
            data?: Room & { snapshot?: PrivateGameSnapshot };
          }>(SOCKET_EVENTS.RECONNECT, {})) as {
            success: boolean;
            data?: Room & { snapshot?: PrivateGameSnapshot };
          };
          if (!res?.success || !res.data?.id) return;
          const data = res.data;
          const prevRoom = useGameStore.getState().room;
          const wasEmpty = !prevRoom?.id;
          const wasLobby =
            prevRoom?.phase === 'waiting' || prevRoom?.phase === 'countdown' || !prevRoom?.phase;
          setRoom(data);
          if (data.phase === 'countdown' && data.countdownRemaining !== undefined) {
            setCountdown(data.countdownRemaining);
          }
          if (isInGamePhase(data.phase)) {
            setCountdown(null);
          }
          if (data.snapshot) {
            if (data.snapshot.reshuffleEpoch && data.snapshot.reshuffleEpoch > lastReshuffleEpoch) {
              lastReshuffleEpoch = data.snapshot.reshuffleEpoch;
            }
            queueOrApplySnapshot(data.snapshot);
          }
          if (data.chat) setChat(data.chat);
          if (wasEmpty || (wasLobby && isInGamePhase(data.phase))) {
            navigateToActiveRoom(data);
          }
        } catch {
          // No active room — normal for a fresh session.
        }
      };

      const onConnect = () => {
        setSocketConnected(true);
        setError(null);
      };

      const onDisconnect = () => {
        const s = getSocket();
        if (s?.active) return;
        setSocketConnected(false);
      };

      const onShuffle = () => {
        if (reshuffleSequenceActive || roundShuffleInProgress) return;
        const phase = useGameStore.getState().snapshot?.phase;
        const countdown = useGameStore.getState().countdown;
        if (phase === 'scoreboard' || (countdown !== null && countdown > 0)) {
          deferRoundShuffle = true;
          return;
        }
        startShuffleSequence();
      };

      const onReshuffle = (event: { displayMessage?: string; epoch?: number }) => {
        const epoch = event.epoch ?? 0;
        if (epoch <= lastReshuffleEpoch) return;
        lastReshuffleEpoch = epoch;
        startReshuffleSequence(event.displayMessage);
      };

      const onEndTrick = (event: {
        winnerUserId: string;
        trick: {
          plays: Array<{
            userId: string;
            card: PrivateGameSnapshot['myHand'][0];
            seatIndex: number;
          }>;
        };
      }) => {
        const snap = useGameStore.getState().snapshot;
        const visibleCardIds =
          snap?.currentTrick?.plays?.length
            ? snap.currentTrick.plays.map((p) => p.card.id)
            : event.trick.plays.map((p) => p.card.id);

        setHeldTrick({
          plays: event.trick.plays,
          winnerUserId: event.winnerUserId,
        });
        setTrickCollect(null);

        if (trickHoldTimer) clearTimeout(trickHoldTimer);
        trickHoldTimer = setTimeout(() => {
          setHeldTrick(null);
          setTrickCollect({
            plays: event.trick.plays,
            winnerUserId: event.winnerUserId,
            visibleCardIds,
          });
          trickHoldTimer = null;
        }, TRICK_HOLD_MS);
      };

      const onDeal = (snap: PrivateGameSnapshot) => {
        if (shouldSuppressGameSnapshots()) return;
        queueOrApplySnapshot(snap);
      };

      const onGameStart = (data: Room & { snapshot?: PrivateGameSnapshot }) => {
        setCountdown(null);
        onRoom(data);
      };

      socket.on(SOCKET_EVENTS.ROOM_UPDATED, onRoom);
      socket.on(SOCKET_EVENTS.SUSPEND_UPDATED, onSuspendUpdated);
      socket.on(SOCKET_EVENTS.GAME_START, onGameStart);
      socket.on(SOCKET_EVENTS.SHUFFLE, onShuffle);
      socket.on(SOCKET_EVENTS.RESHUFFLE_STATUS, onReshuffle);
      socket.on(SOCKET_EVENTS.DEAL_CARDS, onDeal);
      socket.on(SOCKET_EVENTS.END_TRICK, onEndTrick);
      socket.on(SOCKET_EVENTS.COUNTDOWN, (p: { remaining: number }) => {
        setError(null);
        setCountdown(p.remaining);
        const current = useGameStore.getState().room;
        if (current) {
          setRoom({
            ...current,
            phase: 'countdown',
            countdownRemaining: p.remaining,
          });
        }
      });
      socket.on(SOCKET_EVENTS.CHAT_MESSAGE, onChat);
      socket.on(SOCKET_EVENTS.CHAT_HISTORY, onChatHistory);
      socket.on(SOCKET_EVENTS.ROOM_CLOSED, onRoomClosed);
      socket.on(SOCKET_EVENTS.ERROR, (e: { message: string }) => {
        if (/game already starting/i.test(e.message)) return;
        setError(e.message);
      });
      socket.on(SOCKET_EVENTS.GAME_FINISHED, () => setCountdown(null));
      socket.on(SOCKET_EVENTS.PLAYER_RECONNECTED, (p: { room: Room }) => {
        setRoom(p.room);
        if (p.room.chat) setChat(p.room.chat);
      });
      socket.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, (p: { room: Room }) => {
        setRoom(p.room);
      });
      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      heartbeat = setInterval(() => {
        getSocket()?.emit(SOCKET_EVENTS.HEARTBEAT, {});
      }, 15000);

      if (socket.connected) onConnect();

      registerSessionRestore(restoreSession);
      if (socket.connected) {
        void restoreSession();
      }

      return () => {
        registerSessionRestore(() => undefined);
        socket.off(SOCKET_EVENTS.ROOM_UPDATED, onRoom);
        socket.off(SOCKET_EVENTS.SUSPEND_UPDATED, onSuspendUpdated);
        socket.off(SOCKET_EVENTS.GAME_START, onGameStart);
        socket.off(SOCKET_EVENTS.DEAL_CARDS, onDeal);
        socket.off(SOCKET_EVENTS.SHUFFLE, onShuffle);
        socket.off(SOCKET_EVENTS.RESHUFFLE_STATUS, onReshuffle);
        socket.off(SOCKET_EVENTS.END_TRICK, onEndTrick);
        socket.off(SOCKET_EVENTS.COUNTDOWN);
        socket.off(SOCKET_EVENTS.CHAT_MESSAGE, onChat);
        socket.off(SOCKET_EVENTS.CHAT_HISTORY, onChatHistory);
        socket.off(SOCKET_EVENTS.ROOM_CLOSED, onRoomClosed);
        socket.off(SOCKET_EVENTS.ERROR);
        socket.off(SOCKET_EVENTS.GAME_FINISHED);
        socket.off(SOCKET_EVENTS.PLAYER_RECONNECTED);
        socket.off(SOCKET_EVENTS.PLAYER_DISCONNECTED);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        if (heartbeat) clearInterval(heartbeat);
        if (trickHoldTimer) clearTimeout(trickHoldTimer);
        clearOverlayTimers();
        reshuffleSequenceActive = false;
        deferRoundShuffle = false;
        roundShuffleInProgress = false;
        clearRoomSyncGuards();
      };
    };

    let unbind: (() => void) | undefined;

    let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

    void (async () => {
      try {
        const socket = await ensureSocketConnected();
        if (!mounted) return;
        unbind = bindListeners(socket);
        appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
          if (state !== 'active' || !mounted) return;
          void ensureSocketConnected().catch(() => undefined);
        });
      } catch (error) {
        if (mounted) {
          setSocketConnected(false);
          setError(error instanceof Error ? error.message : 'Socket connection failed');
        }
      }
    })();

    return () => {
      mounted = false;
      appStateSub?.remove();
      unbind?.();
    };
  }, [
    user?.id,
    setRoom,
    setSnapshot,
    setCountdown,
    setChat,
    pushChat,
    setError,
    setSocketConnected,
    setTrickCollect,
    setHeldTrick,
    setTableOverlay,
    setHideHand,
    setPendingSnapshot,
    applySuspendApprovals,
  ]);
}
