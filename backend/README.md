# Backend

## Architecture

Clean Architecture layers:

- **routes / controllers** — HTTP entry
- **socket** — realtime entry
- **services** — use-cases (Auth, Room)
- **repositories** — Mongo persistence
- **game** — pure domain engine (Deck, Rules, Reshuffle, Bid, Score, GameEngine)
- **config / middlewares / validators** — cross-cutting

The `GameEngine` is authoritative. Clients never decide legal plays, scores, or winners.

## Scripts

```bash
npm install
cp .env.example .env
npm run dev
npm test
npm run build
```

## Socket events

Client → Server: `createRoom`, `joinRoom`, `leaveRoom`, `playerReady`, `requestReshuffle`, `acceptReshuffle`, `placeBid`, `playCard`, `sendChat`, `heartbeat`, `reconnect`

Server → Client: `roomUpdated`, `gameStart`, `dealCards`, `countdown`, `reshuffleStatus`, `biddingStarted`, `bidPlaced`, `playingStarted`, `cardPlayed`, `endTrick`, `roundScore`, `scoreboard`, `nextRound`, `gameFinished`, `chatMessage`, `error`, disconnect/reconnect notices

## Scaling notes

- Sticky sessions (or Socket.IO Redis adapter) for multi-node
- Redis for room lookups / rate limits / presence
- Mongo for durable users, matches, stats
- PM2 cluster via `ecosystem.config.js`
