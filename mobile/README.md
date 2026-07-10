# R-SPADE Mobile

React Native (Expo) client for the custom multiplayer Spade game.

## Setup

```bash
npm install
# Point at your API (Android emulator → 10.0.2.2; device → LAN IP)
# EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
npx expo start
```

## Screens

- Auth (email / guest; Google & Apple API-ready)
- Lobby (create 3/4/5P, public list, invite join)
- Room (ready, chat, countdown)
- Game (animated deal, bid, play, reshuffle)
- Scoreboard / History / Leaderboard

## Stack

Zustand · React Query · Socket.IO · Reanimated · Gesture Handler · SVG · AsyncStorage · React Hook Form
