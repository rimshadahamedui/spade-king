import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { LobbySeatRing } from '../components/LobbySeatRing';
import { StartTableOverlay } from '../components/StartTableOverlay';
import { ScreenBackdrop } from '../components/ScreenBackdrop';
import { emitAck, ensureSocketConnected, SOCKET_EVENTS } from '../services/socket';
import { formatApiError } from '../utils/network';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import type { RootStackParamList } from '../navigation/types';
import type { Room } from '../models/types';
import { colors, fonts, radii, spacing, surfaces } from '../theme';

const CHAT_INPUT_HEIGHT = 36;
const TOOLBAR_BTN = { minWidth: 76, height: CHAT_INPUT_HEIGHT };

export function RoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const room = useGameStore((s) => s.room);
  const countdown = useGameStore((s) => s.countdown);
  const chat = useGameStore((s) => s.chat);
  const socketConnected = useGameStore((s) => s.socketConnected);
  const setRoom = useGameStore((s) => s.setRoom);
  const lastError = useGameStore((s) => s.lastError);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const insets = useSafeAreaInsets();

  const isHost = room?.hostId === user?.id;

  const isFull = !!room && room.players.length >= room.maxPlayers;
  const startApprovals = room?.startApprovals ?? [];
  const hasConfirmedStart = !!user?.id && startApprovals.includes(user.id);
  const startCount = startApprovals.length;
  const showStartOverlay =
    !!room &&
    room.phase === 'waiting' &&
    isFull &&
    countdown === null &&
    !hasConfirmedStart &&
    socketConnected;

  const inGame =
    !!room &&
    room.phase !== 'waiting' &&
    room.phase !== 'countdown' &&
    room.phase !== 'finished';

  useLayoutEffect(() => {
    if (!inGame) return;
    navigation.navigate('Game');
  }, [inGame, navigation]);

  const confirmStart = useCallback(async () => {
    if (hasConfirmedStart || busy) return;
    try {
      setBusy(true);
      await ensureSocketConnected();
      const res = (await emitAck(SOCKET_EVENTS.CONFIRM_START, {})) as {
        success: boolean;
        data?: Room;
      };
      if (res?.data) setRoom(res.data);
    } catch (e) {
      Alert.alert('Could not start', formatApiError(e));
    } finally {
      setBusy(false);
    }
  }, [hasConfirmedStart, busy, setRoom]);

  const pad = {
    paddingTop: Math.max(insets.top, 8),
    paddingBottom: Math.max(insets.bottom, 8),
    paddingLeft: Math.max(insets.left, 12),
    paddingRight: Math.max(insets.right, 12),
  };

  if (!room) {
    return (
      <ScreenBackdrop>
        <SafeAreaView style={[styles.safe, styles.center]} edges={[]}>
          <Text style={styles.title}>No active table</Text>
          <Button title="Back to Lounge" onPress={() => navigation.navigate('Lobby')} />
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  if (countdown !== null && countdown >= 0 && room.phase === 'countdown') {
    const dealingNow = countdown === 0;
    return (
      <ScreenBackdrop>
        <SafeAreaView style={[styles.safe, styles.center, pad]} edges={[]}>
          <Text style={styles.kicker}>{dealingNow ? 'Dealing' : 'Dealing in'}</Text>
          <Text style={styles.countdown}>{dealingNow ? '…' : countdown}</Text>
          {!dealingNow && <Text style={styles.sub}>Hold your nerve</Text>}
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  if (inGame) {
    return (
      <ScreenBackdrop>
        <SafeAreaView style={[styles.safe, styles.center, pad]} edges={[]}>
          <Text style={styles.kicker}>Dealing</Text>
          <Text style={styles.countdown}>…</Text>
        </SafeAreaView>
      </ScreenBackdrop>
    );
  }

  const leave = async () => {
    try {
      setBusy(true);
      await emitAck(SOCKET_EVENTS.LEAVE_ROOM, {});
      useGameStore.getState().reset();
      navigation.navigate('RoomList', { roomType: room.roomType });
    } catch (e) {
      Alert.alert('Leave failed', formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteRoom = () => {
    Alert.alert(
      'Delete this room?',
      'Everyone will be removed from the lobby. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteRoom(),
        },
      ],
    );
  };

  const deleteRoom = async () => {
    try {
      setBusy(true);
      await emitAck(SOCKET_EVENTS.DELETE_ROOM, {});
      useGameStore.getState().reset();
      navigation.navigate('RoomList', { roomType: room.roomType });
    } catch (e) {
      Alert.alert('Could not delete room', formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    if (!message.trim()) return;
    try {
      await emitAck(SOCKET_EVENTS.SEND_CHAT, { message });
      setMessage('');
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Message failed', formatApiError(e));
    }
  };

  return (
    <ScreenBackdrop>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <SafeAreaView style={styles.safe} edges={[]}>
          <View style={[styles.root, pad]}>
            <View style={styles.headerRow}>
              <View style={styles.header}>
                <Text style={styles.kicker}>
                  {room.roomType}-player · {room.inviteCode}
                </Text>
                <Text style={styles.sub}>
                  {room.players.length}/{room.maxPlayers} seated ·{' '}
                  {socketConnected ? 'Live' : 'Reconnecting…'}
                  {isFull && ` · ${startCount}/${room.maxPlayers} ready to start`}
                </Text>
                {!!lastError && !/game already starting/i.test(lastError) && (
                  <Text style={styles.error}>{lastError}</Text>
                )}
              </View>
              <View style={styles.headerActions}>
                {isHost && room.phase === 'waiting' && (
                  <Button
                    title="Delete"
                    variant="danger"
                    compact
                    onPress={confirmDeleteRoom}
                    disabled={busy}
                    style={styles.toolbarBtn}
                  />
                )}
                <Button
                  title="Leave"
                  variant="ghost"
                  compact
                  onPress={leave}
                  disabled={busy}
                  style={styles.toolbarBtn}
                />
              </View>
            </View>

            {isFull && room.phase === 'waiting' && (
              <View style={styles.startBar}>
                <View style={styles.startBarText}>
                  <Text style={styles.startBarTitle}>Table full — ready to play</Text>
                  <Text style={styles.startBarMeta}>
                    {startCount}/{room.maxPlayers} tapped Start
                  </Text>
                </View>
                {hasConfirmedStart ? (
                  <Text style={styles.startBarWait}>Waiting…</Text>
                ) : (
                  <Button
                    title="Start"
                    onPress={() => void confirmStart()}
                    disabled={busy}
                    compact
                    style={styles.startBarBtn}
                  />
                )}
              </View>
            )}

            <View style={styles.mainRow}>
              <View style={styles.playersPanel}>
                <Text style={styles.panelTitle}>Players</Text>
                <LobbySeatRing
                  maxPlayers={room.maxPlayers}
                  players={room.players}
                  myUserId={user?.id}
                  startApprovals={startApprovals}
                  tableFull={isFull}
                />
              </View>

              <View style={styles.chatPanel}>
                <Text style={styles.panelTitle}>Chat</Text>
                <View style={styles.chatBox}>
                  <FlatList
                    style={styles.chat}
                    data={chat}
                    keyExtractor={(item) => `${item.at}-${item.userId}`}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    ListEmptyComponent={<Text style={styles.emptyChat}>Say hi…</Text>}
                    renderItem={({ item }) => (
                      <Text style={styles.chatLine} numberOfLines={3}>
                        <Text style={styles.chatUser}>{item.username}: </Text>
                        {item.message}
                      </Text>
                    )}
                  />
                </View>
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Message"
                    placeholderTextColor={colors.textDim}
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={() => void sendChat()}
                    returnKeyType="send"
                    blurOnSubmit={false}
                  />
                  <Pressable
                    onPress={() => void sendChat()}
                    disabled={!message.trim()}
                    style={({ pressed }) => [
                      styles.sendBtn,
                      !message.trim() && styles.sendBtnDisabled,
                      pressed && styles.sendBtnPressed,
                    ]}
                  >
                    <Text style={styles.sendBtnText}>Send</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <StartTableOverlay
              visible={showStartOverlay}
              startCount={startCount}
              maxPlayers={room.maxPlayers}
              busy={busy}
              onConfirm={() => void confirmStart()}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  root: { flex: 1, overflow: 'hidden' },
  center: { justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: { flex: 1, minWidth: 0 },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
    alignItems: 'center',
  },
  toolbarBtn: TOOLBAR_BTN,
  kicker: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.cream,
    fontSize: 28,
    fontFamily: fonts.display,
    letterSpacing: 2,
    marginTop: 2,
  },
  sub: {
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  countdown: {
    color: colors.accentBright,
    fontSize: 96,
    fontFamily: fonts.display,
    lineHeight: 108,
  },
  startBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    ...surfaces.panel,
    borderColor: colors.accentBright,
    borderWidth: 1,
  },
  startBarText: { flex: 1, minWidth: 0 },
  startBarTitle: {
    color: colors.cream,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  startBarMeta: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  startBarWait: {
    color: colors.accentBright,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  startBarBtn: { minWidth: 88 },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 0,
  },
  playersPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: radii.md,
    ...surfaces.panel,
    padding: spacing.sm,
    minHeight: 0,
  },
  chatPanel: {
    width: 220,
    flexShrink: 0,
    alignSelf: 'stretch',
    borderRadius: radii.md,
    ...surfaces.panel,
    padding: spacing.sm,
    minHeight: 0,
  },
  panelTitle: {
    color: colors.textMuted,
    marginBottom: 6,
    fontFamily: fonts.bodyMedium,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 9,
  },
  error: { color: colors.danger, marginTop: 2, fontFamily: fonts.body, fontSize: 10 },
  chatBox: {
    flex: 1,
    minHeight: 60,
    borderRadius: radii.sm,
    ...surfaces.panelSoft,
    overflow: 'hidden',
  },
  emptyChat: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 10,
    padding: 6,
  },
  chat: { flex: 1, padding: 6 },
  chatLine: {
    color: colors.text,
    marginBottom: 4,
    fontFamily: fonts.body,
    lineHeight: 14,
    fontSize: 10,
  },
  chatUser: { color: colors.accentBright, fontFamily: fonts.bodyBold },
  chatInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    alignItems: 'stretch',
    height: CHAT_INPUT_HEIGHT,
  },
  chatInput: {
    flex: 1,
    height: CHAT_INPUT_HEIGHT,
    ...surfaces.input,
    borderRadius: radii.sm,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontFamily: fonts.body,
    fontSize: 11,
  },
  sendBtn: {
    width: 52,
    height: CHAT_INPUT_HEIGHT,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accentBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnPressed: { opacity: 0.85 },
  sendBtnText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
