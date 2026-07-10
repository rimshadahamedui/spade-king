import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import type { Room } from '../models/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function isInGamePhase(phase: string): boolean {
  return phase !== 'waiting' && phase !== 'countdown' && phase !== 'finished';
}

/** Hard reset to lobby — reliable on iOS after room teardown. */
export function navigateToLobby(): void {
  const go = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Lobby' }],
      }),
    );
    return true;
  };

  if (go()) return;

  let attempts = 0;
  const id = setInterval(() => {
    attempts += 1;
    if (go() || attempts > 60) clearInterval(id);
  }, 50);
}

export function navigateToActiveRoom(room: Room): void {
  if (!navigationRef.isReady()) return;

  const route = navigationRef.getCurrentRoute()?.name;
  if (route === 'Game') return;
  if (route === 'Scoreboard' && room.phase === 'finished') return;

  if (isInGamePhase(room.phase)) {
    navigationRef.navigate('Game');
    return;
  }

  if (room.phase === 'finished') {
    navigationRef.navigate('Scoreboard');
    return;
  }

  if (route !== 'Room') {
    navigationRef.navigate('Room');
  }
}
