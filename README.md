# R-SPADE

Production-ready multiplayer Spade Card Game for Android and iOS.

Custom individual scoring rules — no partnerships, nil, bags, or blind nil.

## Stack

| Layer | Tech |
|-------|------|
| Mobile | React Native, TypeScript, Zustand, React Query, Socket.IO Client |
| API | Node.js, Express, Socket.IO, JWT |
| Data | MongoDB (Mongoose), Redis |
| Deploy | Docker, PM2 |

## Game Modes

| Mode | Players | Deck | Cards/player | Min bid total |
|------|---------|------|--------------|---------------|
| 3P | 3 | 36 (remove 2–5) | 12 | 8 |
| 4P | 4 | 40 (remove 2–4) | 10 | 8 |
| 5P | 5 | 50 (remove 2♣ 2♦) | 10 | 8 |

13 rounds per match. Highest total score wins.

## Quick Start

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Mobile
cd mobile
npm install
npx expo start
```

## Docker

```bash
docker-compose up --build
```

## Project Layout

```
backend/   Clean Architecture API + Game Engine + Socket.IO
mobile/    React Native client
```

## Security Note

**Rotate the MongoDB Atlas password immediately** — it was provided in chat/plaintext. Prefer environment secrets only (`.env` is gitignored).

## Verified

- Backend: MongoDB Atlas connected, guest auth OK, API on `:4000`
- Unit + integration tests: **26 passing**
- Redis: optional locally (falls back to in-memory adapter)
