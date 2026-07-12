import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmOverlay } from '../components/ConfirmOverlay';
import { Button } from '../components/Button';
import { GameTableLayout } from '../components/GameTableLayout';
import { HandFan } from '../components/HandFan';
import { PresetChatPanel } from '../components/PresetChatPanel';
import { ScoreTablePanel } from '../components/ScoreTablePanel';
import { ScoreRoundsList } from '../components/ScoreRoundsList';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { TableCenterMessage } from '../components/TableCenterMessage';
import { TableFeltBackground } from '../components/TableFeltBackground';
import { TrickPile } from '../components/TrickPile';
import { flushTrickDeferredSnapshot } from '../hooks/useSocketBindings';
import { useIsPortrait } from '../hooks/useIsPortrait';
import { ADMIN_EMAIL } from '../constants';
import { emitAck, SOCKET_EVENTS } from '../services/socket';
import { adminApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatApiError } from '../utils/network';
import { alertMessage } from '../utils/confirm';
import { navigateToLobby } from '../navigation/navigationRef';
import { queryClient } from '../queryClient';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';
import type { Room } from '../models/types';
import { getLegalPlays } from '../utils/cardRules';
import { formatReshuffleReasons } from '../utils/reshuffleLabels';
import { useTableChatBubbles } from '../hooks/useTableChatBubbles';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

export function GameScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const room = useGameStore((s) => s.room);
  const setRoom = useGameStore((s) => s.setRoom);
  const applySuspendApprovals = useGameStore((s) => s.applySuspendApprovals);
  const snapshot = useGameStore((s) => s.snapshot);
  const trickCollect = useGameStore((s) => s.trickCollect);
  const heldTrick = useGameStore((s) => s.heldTrick);
  const tableOverlay = useGameStore((s) => s.tableOverlay);
  const hideHand = useGameStore((s) => s.hideHand);
  const setError = useGameStore((s) => s.setError);
  const setTrickCollect = useGameStore((s) => s.setTrickCollect);
  const [selected, setSelected] = useState<string | null>(null);
  const [tableBounds, setTableBounds] = useState({ width: 0, height: 0 });
  const [handWidth, setHandWidth] = useState(0);
  const [scoreCountdown, setScoreCountdown] = useState(10);
  const [scorePanelOpen, setScorePanelOpen] = useState(false);
  const [presetChatOpen, setPresetChatOpen] = useState(false);
  const [presetChatBusy, setPresetChatBusy] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendBusy, setSuspendBusy] = useState(false);
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const isPortrait = useIsPortrait();
  const { height: winH } = useWindowDimensions();
  const handDockHeight = isPortrait ? Math.min(140, Math.max(100, winH * 0.16)) : 118;
  const isAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const autoPlayRef = useRef<string | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playInFlightRef = useRef(false);
  const suspendDismissedRef = useRef(false);
  const prevSuspendCountRef = useRef(0);
  const { bubbles: tableChatBubbles } = useTableChatBubbles();

  const mySeat = useMemo(
    () => snapshot?.players.find((p) => p.userId === user?.id)?.seatIndex,
    [snapshot, user],
  );

  const isMyTurn =
    snapshot?.phase === 'playing' && snapshot.currentTurnSeatIndex === mySeat;

  const isMyBidTurn =
    snapshot?.phase === 'bidding' && snapshot.currentBidderSeatIndex === mySeat;

  const leadSuit =
    snapshot?.currentTrick?.plays?.length
      ? snapshot.currentTrick.leadSuit ?? null
      : null;

  const legalPlays = useMemo(() => {
    if (!snapshot?.myHand) return [];
    return getLegalPlays(snapshot.myHand, leadSuit);
  }, [snapshot?.myHand, leadSuit]);

  const legalIds = useMemo(() => new Set(legalPlays.map((c) => c.id)), [legalPlays]);

  const maxBid = snapshot?.myHand?.length ?? 1;
  const bidOptions = useMemo(
    () => Array.from({ length: maxBid }, (_, i) => i + 1),
    [maxBid],
  );

  const playCard = useCallback(
    async (cardId: string) => {
      if (!isMyTurn || !legalIds.has(cardId) || playInFlightRef.current) return;
      playInFlightRef.current = true;
      try {
        await emitAck(SOCKET_EVENTS.PLAY_CARD, { cardId });
        setSelected(null);
      } finally {
        playInFlightRef.current = false;
      }
    },
    [isMyTurn, legalIds],
  );

  useEffect(() => {
    if (snapshot?.phase !== 'playing' || !isMyTurn || legalPlays.length !== 1) {
      autoPlayRef.current = null;
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      return;
    }
    const only = legalPlays[0].id;
    if (autoPlayRef.current === only) return;
    autoPlayRef.current = only;
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    autoPlayTimerRef.current = setTimeout(() => {
      void playCard(only);
      autoPlayTimerRef.current = null;
    }, 500);
    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [snapshot?.phase, isMyTurn, legalPlays, playCard]);

  useEffect(() => {
    if (snapshot?.phase !== 'finished') return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const navigateWhenReady = () => {
      if (cancelled) return;
      const { heldTrick, trickCollect, pendingSnapshot } = useGameStore.getState();
      if (heldTrick || trickCollect) {
        pollTimer = setTimeout(navigateWhenReady, 250);
        return;
      }
      if (pendingSnapshot?.phase === 'finished') {
        useGameStore.getState().setSnapshot(pendingSnapshot);
        useGameStore.getState().setPendingSnapshot(null);
      }
      InteractionManager.runAfterInteractions(() => {
        if (!cancelled) navigation.navigate('Scoreboard');
      });
    };

    const delay = setTimeout(navigateWhenReady, 600);

    return () => {
      cancelled = true;
      clearTimeout(delay);
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [snapshot?.phase, navigation]);

  useEffect(() => {
    if (snapshot?.phase !== 'scoreboard') {
      setScoreCountdown(10);
      return;
    }

    const tick = () => {
      if (snapshot.scoreboardEndsAt) {
        const left = Math.max(0, Math.ceil((snapshot.scoreboardEndsAt - Date.now()) / 1000));
        setScoreCountdown(left);
      }
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [snapshot?.phase, snapshot?.scoreboardEndsAt]);

  const hasApproved = snapshot?.roundApprovals?.includes(user?.id ?? '') ?? false;
  const approvalCount = snapshot?.roundApprovals?.length ?? 0;
  const playerCount = snapshot?.players.length ?? 0;
  const suspendApprovals = room?.suspendApprovals ?? snapshot?.suspendApprovals ?? [];
  const suspendApprovalKey = suspendApprovals.join('|');
  const hasSuspendApproved = !!user?.id && suspendApprovals.includes(user.id);

  useEffect(() => {
    if (!user?.id) return;

    const count = suspendApprovals.length;
    if (count > prevSuspendCountRef.current) {
      suspendDismissedRef.current = false;
    }
    prevSuspendCountRef.current = count;

    if (count === 0) {
      suspendDismissedRef.current = false;
      return;
    }

    if (suspendApprovals.includes(user.id)) {
      setSuspendDialogOpen(false);
      return;
    }

    if (!suspendDismissedRef.current) {
      setSuspendDialogOpen(true);
    }
  }, [suspendApprovalKey, user?.id]);

  const submitSuspendVote = useCallback(async () => {
    if (!user?.id || suspendApprovals.includes(user.id) || suspendBusy) return;
    setSuspendBusy(true);
    const optimistic = [...suspendApprovals, user.id];
    applySuspendApprovals(optimistic);
    try {
      const res = (await emitAck(SOCKET_EVENTS.REQUEST_SUSPEND, {})) as {
        success?: boolean;
        data?: Room;
      };
      if (res?.data?.suspendApprovals) {
        applySuspendApprovals(res.data.suspendApprovals);
        setRoom(res.data);
      }
      setSuspendDialogOpen(false);
    } catch (err) {
      applySuspendApprovals(suspendApprovals);
      setError(err instanceof Error ? err.message : 'Could not end game');
      setSuspendDialogOpen(true);
    } finally {
      setSuspendBusy(false);
    }
  }, [user?.id, suspendApprovals, suspendBusy, setError, setRoom, applySuspendApprovals]);

  const confirmSuspend = useCallback(() => {
    if (!user?.id || suspendApprovals.includes(user.id)) return;
    suspendDismissedRef.current = false;
    setSuspendDialogOpen(true);
  }, [user?.id, suspendApprovals]);

  const dismissSuspendDialog = useCallback(() => {
    if (suspendBusy) return;
    suspendDismissedRef.current = true;
    setSuspendDialogOpen(false);
  }, [suspendBusy]);

  const purgeAllRooms = useCallback(() => {
    setPurgeDialogOpen(true);
  }, []);

  const dismissPurgeDialog = useCallback(() => {
    if (adminBusy) return;
    setPurgeDialogOpen(false);
  }, [adminBusy]);

  const submitPurgeAllRooms = useCallback(async () => {
    setAdminBusy(true);
    try {
      let closed = 0;
      try {
        const res = (await emitAck<{ success: boolean; data?: { closed?: number } }>(
          SOCKET_EVENTS.ADMIN_PURGE_ROOMS,
          {},
        )) as { success: boolean; data?: { closed?: number } };
        closed = res.data?.closed ?? 0;
      } catch {
        const res = await adminApi.purgeRooms();
        closed = res.data.data?.closed ?? 0;
      }
      setPurgeDialogOpen(false);
      useGameStore.getState().reset();
      navigateToLobby();
      void queryClient.invalidateQueries({ queryKey: ['publicRooms'] });
      alertMessage('Rooms cleared', `${closed} room(s) closed.`);
    } catch (e) {
      alertMessage('Failed', formatApiError(e));
    } finally {
      setAdminBusy(false);
    }
  }, []);

  const sendPresetChat = useCallback(async (message: string) => {
    if (presetChatBusy) return;
    setPresetChatBusy(true);
    try {
      await emitAck(SOCKET_EVENTS.SEND_CHAT, { message });
      setPresetChatOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message');
    } finally {
      setPresetChatBusy(false);
    }
  }, [presetChatBusy, setError]);

  const onTableLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setTableBounds({ width, height });
  };

  const onHandLayout = (e: LayoutChangeEvent) => {
    setHandWidth(e.nativeEvent.layout.width);
  };

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 10),
    paddingRight: Math.max(insets.right, 10),
  };

  if (!snapshot) {
    return (
      <ScreenBackdrop>
        <SafeAreaView style={[styles.safe, styles.center]} edges={['top', 'left', 'right', 'bottom']}>
          <Text style={styles.muted}>Cutting the deck…</Text>
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  const placeBid = async (bid: number) => {
    await emitAck(SOCKET_EVENTS.PLACE_BID, { bid });
  };

  const requestReshuffle = async () => {
    await emitAck(SOCKET_EVENTS.REQUEST_RESHUFFLE, {});
  };

  const approveRound = async () => {
    await emitAck(SOCKET_EVENTS.APPROVE_NEXT_ROUND, {});
  };

  const handleCardPress = (cardId: string) => {
    if (snapshot.phase !== 'playing' || !isMyTurn || !legalIds.has(cardId)) return;
    setSelected(cardId);
    void playCard(cardId);
  };

  const phaseLabel = snapshot.phase.replace(/_/g, ' ');
  const isFinalRound = snapshot.round >= snapshot.totalRounds;
  const showScoreboard = snapshot.phase === 'scoreboard';
  const showFinalScoreboard = showScoreboard && isFinalRound;
  const showPlaying = snapshot.phase === 'playing';
  const showHand =
    ['bidding', 'playing', 'reshuffle_check'].includes(snapshot.phase) && !hideHand;
  const trickPlays =
    snapshot.currentTrick?.plays?.length
      ? snapshot.currentTrick.plays
      : heldTrick?.plays ?? [];
  const canBidReshuffle = snapshot.canBidReshuffle ?? false;
  const bidReshuffleHint =
    snapshot.reshuffleReasons && snapshot.reshuffleReasons.length > 0
      ? `${formatReshuffleReasons(snapshot.reshuffleReasons)} — request a new deal instead of bidding.`
      : 'Request a new deal instead of bidding.';
  const displayPlayers = hideHand
    ? snapshot.players.map((p) => ({ ...p, handCount: 0 }))
    : snapshot.players;
  const displayHand = hideHand ? [] : snapshot.myHand;
  const showTableOverlay = !!tableOverlay && !showScoreboard;
  const showBidUi = !tableOverlay && !hideHand;
  const suspendMessage =
    suspendApprovals.length > 0
      ? `${suspendApprovals.length}/${playerCount} players agreed to end. If everyone agrees, the game will end and no scores will be saved.`
      : 'If all players agree, the game will end and no scores will be saved.';

  return (
    <ScreenBackdrop>
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={[styles.body, pad]}>
          <View style={styles.mainRow}>
            <View style={styles.tableColumn}>
              <View style={styles.topBar}>
                <View style={styles.roundBlock}>
                  <Text style={styles.kicker}>Hand</Text>
                  <Text style={styles.round}>
                    {snapshot.round}
                    <Text style={styles.roundOf}> / {snapshot.totalRounds}</Text>
                  </Text>
                </View>
                <View style={styles.phasePill}>
                  <Text style={styles.phase}>{phaseLabel}</Text>
                </View>
                <View style={styles.topActions}>
                  {isAdmin ? (
                    <Pressable
                      style={[styles.adminBtn, adminBusy && styles.adminBtnBusy]}
                      onPress={purgeAllRooms}
                      disabled={adminBusy}
                      hitSlop={12}
                      accessibilityLabel="Clear all rooms"
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={11}
                        color={colors.danger}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.pauseBtn, hasSuspendApproved && styles.pauseBtnActive]}
                    onPress={confirmSuspend}
                    disabled={hasSuspendApproved}
                    hitSlop={12}
                    accessibilityLabel="End game"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="pause"
                      size={11}
                      color={hasSuspendApproved ? colors.accentBright : colors.cream}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.tableStage}>
                <View style={styles.tableShell}>
                  <View style={styles.table} onLayout={onTableLayout}>
                    {tableBounds.width > 0 && (
                      <TableFeltBackground
                        width={tableBounds.width}
                        height={tableBounds.height}
                        borderRadius={18}
                      />
                    )}
                    <View style={styles.tableRail} />

                    {tableBounds.width > 0 && (
                      <GameTableLayout
                        bounds={tableBounds}
                        players={displayPlayers}
                        myUserId={user?.id ?? ''}
                        currentTurnSeatIndex={snapshot.currentTurnSeatIndex}
                        currentBidderSeatIndex={snapshot.currentBidderSeatIndex}
                        shufflerSeatIndex={snapshot.shufflerSeatIndex}
                        roundScores={snapshot.scores}
                        showRoundWon={showScoreboard}
                        phase={snapshot.phase}
                        mode="avatars"
                      />
                    )}

                    <View style={styles.trickArea}>
                      {tableBounds.width > 0 && mySeat !== undefined && (
                        <TrickPile
                          plays={trickPlays}
                          mySeat={mySeat}
                          playerCount={snapshot.players.length}
                          bounds={tableBounds}
                          players={snapshot.players}
                          trickCollect={trickCollect}
                          onCollectDone={() => {
                            setTrickCollect(null);
                            flushTrickDeferredSnapshot();
                          }}
                        />
                      )}
                    </View>

                    {tableBounds.width > 0 && (
                      <View style={styles.chatBubbleLayer} pointerEvents="none">
                        <GameTableLayout
                          bounds={tableBounds}
                          players={displayPlayers}
                          myUserId={user?.id ?? ''}
                          currentTurnSeatIndex={snapshot.currentTurnSeatIndex}
                          currentBidderSeatIndex={snapshot.currentBidderSeatIndex}
                          shufflerSeatIndex={snapshot.shufflerSeatIndex}
                          roundScores={snapshot.scores}
                          showRoundWon={showScoreboard}
                          phase={snapshot.phase}
                          chatBubbles={tableChatBubbles}
                          mode="bubbles"
                        />
                      </View>
                    )}

                    {showTableOverlay && <TableCenterMessage text={tableOverlay!} />}
                  </View>
                </View>

                {showBidUi && isMyBidTurn && canBidReshuffle && (
                  <View style={styles.bidOverlay}>
                    <View style={styles.bidModal}>
                      <Text style={styles.bidModalTitle}>Reshuffle?</Text>
                      <Text style={styles.bidReshuffleHint}>{bidReshuffleHint}</Text>
                      <Button title="Reshuffle" onPress={requestReshuffle} />
                    </View>
                  </View>
                )}

                {showBidUi && isMyBidTurn && !canBidReshuffle && (
                  <View style={styles.bidOverlay}>
                    <View style={styles.bidModal}>
                      <Text style={styles.bidModalTitle}>Your bid</Text>
                      <ScrollView
                        style={styles.bidScroll}
                        contentContainerStyle={styles.bidGrid}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                      >
                        {bidOptions.map((n) => (
                          <Pressable
                            key={n}
                            onPress={() => void placeBid(n)}
                            style={({ pressed }) => [
                              styles.bidOption,
                              pressed && styles.bidOptionPressed,
                            ]}
                          >
                            <Text style={styles.bidOptionText}>{n}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.handDock, { height: handDockHeight }]}>
            {showHand && (
              <View style={styles.handArea} onLayout={onHandLayout}>
                {handWidth > 0 && (
                  <HandFan
                    cards={displayHand}
                    orientation="horizontal"
                    containerWidth={handWidth}
                    selectedId={selected}
                    legalIds={legalIds}
                    disabled={!showPlaying || !isMyTurn}
                    onPress={handleCardPress}
                    onPlay={(id) => void playCard(id)}
                  />
                )}
              </View>
            )}
          </View>

          <View style={styles.scoreLayer} pointerEvents="box-none">
            <ScoreTablePanel
              snapshot={snapshot}
              open={scorePanelOpen && !showScoreboard}
              onToggle={() => setScorePanelOpen((v) => !v)}
              bottomInset={handDockHeight + spacing.sm}
              leftInset={Math.max(insets.left, spacing.sm) + spacing.sm}
              rightInset={Math.max(insets.right, spacing.sm) + spacing.sm}
            />
          </View>

          {showScoreboard && (
            <View style={styles.roundScoreLayer}>
              <View style={styles.roundScoreBackdrop} />
              <ScrollView
                style={styles.roundScoreScroll}
                contentContainerStyle={styles.roundScoreScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={[styles.scoreOverlay, isPortrait && styles.scoreOverlayPortrait]}>
                  <Text style={styles.scoreTitle}>
                    {showFinalScoreboard
                      ? `Final Round · Round ${snapshot.round}`
                      : `Round ${snapshot.round} scores`}
                  </Text>
                  <ScoreRoundsList
                    snapshot={snapshot}
                    maxHeight={winH * 0.6}
                    highlightRound={snapshot.round}
                    size="comfortable"
                  />
                  <Text style={styles.approvalMeta}>
                    {showFinalScoreboard
                      ? `Match results in ${scoreCountdown}s`
                      : `Next round in ${scoreCountdown}s · ${approvalCount}/${playerCount} ready`}
                  </Text>
                  {!showFinalScoreboard && (
                    <Button
                      title="Next Round"
                      disabled={hasApproved}
                      onPress={approveRound}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        {!showScoreboard && (
          <View
            style={[
              styles.presetChatLayer,
              {
                right: Math.max(insets.right, 10),
                bottom: handDockHeight + Math.max(insets.bottom, spacing.sm),
              },
            ]}
            pointerEvents="box-none"
          >
            <PresetChatPanel
              open={presetChatOpen}
              busy={presetChatBusy}
              onToggle={() => setPresetChatOpen((open) => !open)}
              onSelect={(message) => void sendPresetChat(message)}
            />
          </View>
        )}

        <ConfirmOverlay
          visible={suspendDialogOpen}
          title="End game?"
          message={suspendMessage}
          confirmText="End"
          cancelText="Cancel"
          destructive
          busy={suspendBusy}
          onConfirm={() => void submitSuspendVote()}
          onCancel={dismissSuspendDialog}
        />

        <ConfirmOverlay
          visible={purgeDialogOpen}
          title="Clear all rooms?"
          message="Every active table will close and all players will return to the lobby."
          confirmText="Clear rooms"
          cancelText="Cancel"
          destructive
          busy={adminBusy}
          onConfirm={() => void submitPurgeAllRooms()}
          onCancel={dismissPurgeDialog}
        />
      </SafeAreaView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, overflow: 'hidden', position: 'relative' },
  pauseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  adminBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120, 20, 20, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(232, 93, 93, 0.45)',
  },
  adminBtnBusy: {
    opacity: 0.55,
  },
  pauseBtnActive: {
    borderColor: colors.accentBright,
    backgroundColor: 'rgba(201,162,39,0.18)',
  },
  center: { justifyContent: 'center', alignItems: 'center' },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 0,
  },
  tableColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  tableStage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    marginBottom: 2,
    minHeight: 22,
  },
  roundBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  kicker: {
    color: colors.textDim,
    fontSize: 7,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: fonts.bodyMedium,
  },
  round: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 12,
  },
  roundOf: { color: colors.textMuted, fontSize: 9 },
  phasePill: {
    ...surfaces.chip,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderColor: colors.borderStrong,
  },
  phase: {
    color: colors.accentBright,
    textTransform: 'capitalize',
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
  },
  tableShell: {
    flex: 1,
    borderRadius: 20,
    padding: 2,
    backgroundColor: colors.tableEdge,
    minHeight: 0,
  },
  table: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  tableRail: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trickArea: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
    elevation: 10,
  },
  chatBubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    elevation: 60,
    pointerEvents: 'none',
  },
  muted: {
    color: 'rgba(243,239,230,0.45)',
    fontFamily: fonts.body,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 9,
  },
  handDock: {
    justifyContent: 'flex-end',
    paddingTop: 0,
    zIndex: 1,
  },
  scoreLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20000,
    elevation: 20000,
  },
  presetChatLayer: {
    position: 'absolute',
    zIndex: 20001,
    elevation: 20001,
  },
  roundScoreLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30000,
    elevation: 30000,
  },
  roundScoreBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  roundScoreScroll: {
    flex: 1,
  },
  roundScoreScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  handArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    minWidth: 0,
  },
  scoreOverlay: {
    width: '100%',
    maxWidth: 620,
    ...surfaces.panel,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderColor: colors.borderStrong,
    zIndex: 30001,
    elevation: 30001,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  scoreOverlayPortrait: {
    maxWidth: '100%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  scoreTitle: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  approvalMeta: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 10,
  },
  bidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
    zIndex: 30,
  },
  bidModal: {
    width: '100%',
    maxWidth: 300,
    minHeight: '78%',
    maxHeight: '88%',
    ...surfaces.panel,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderColor: colors.borderStrong,
    borderWidth: 1,
  },
  bidModalTitle: {
    color: colors.cream,
    fontFamily: fonts.display,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  bidReshuffleHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  bidScroll: {
    flex: 1,
  },
  bidGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    flexGrow: 1,
  },
  bidOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(201,162,39,0.12)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bidOptionPressed: {
    backgroundColor: 'rgba(201,162,39,0.28)',
    transform: [{ scale: 0.96 }],
  },
  bidOptionText: {
    color: colors.accentBright,
    fontFamily: fonts.display,
    fontSize: 16,
  },
});
