# Ricochet Robots

A web implementation of Ricochet Robots: a polished solo practice mode plus real-time multiplayer with the classic "call your shot" mechanic.

## Tech stack

- **Shared game engine** (`/shared`) — pure, framework-free board generation, sliding-movement physics, and a BFS solver. Imported by both the client (for instant local prediction) and the server (for authoritative validation).
- **Server** (`/server`) — Node.js, Express, Socket.IO. Rooms and round state live in memory only; no database.
- **Client** (`/client`) — React + Vite, Socket.IO client, plain CSS.

## Project structure

```
/shared    board.js, movement.js, solver.js — the game engine, plus test.js (console tests)
/server    Express + Socket.IO app, room/round management
/client    React + Vite app (practice mode and multiplayer)
```

## Running it locally

Requires Node 18+.

```bash
npm install          # installs all three workspaces (shared/server/client)
npm run dev           # runs the server (port 3001) and client (port 5173) together
```

Then open http://localhost:5173.

To run them separately:

```bash
npm run dev:server    # Express + Socket.IO on http://localhost:3001
npm run dev:client    # Vite dev server on http://localhost:5173
```

The client talks to the server at `http://localhost:3001` by default. Override with a `VITE_SERVER_URL` env var (e.g. in `client/.env.local`) if you deploy the server elsewhere.

### Running the shared engine's tests

```bash
npm run test:shared
```

This runs a handful of console assertions covering sliding physics, wall/blocker collisions, move-sequence replay/validation, and the BFS solver (including a solvability check across randomized start positions).

## How to play

**Practice mode** — a target and four robots are placed on the board. Select a robot (click, tap, or Tab+Enter) and slide it with the direction pad, drag, or arrow keys, until the correct-colored robot lands exactly on the target. Undo/reset are available, and "Show best solution" animates the optimal solve.

**Play with Friends** — create a room to get a short code, or join one. Once the host starts a round, everyone sees the identical target and robot layout and experiments privately on their own board. Anyone can declare "I can solve it in N moves," which starts a shared countdown; a lower claim from anyone resets it. When the timer runs out, the lowest claimant has a short grace period to submit their move sequence — the server verifies it's legal and actually reaches the target in that many moves. A correct solve scores a point and replays for everyone; a failed or missed claim passes to the next-lowest claimant. Refreshing mid-round rejoins the same room and resyncs automatically.

## Deploying

- The server is a standard Node process (`node server/src/index.js`); set `PORT` and `CLIENT_ORIGIN` (for CORS) as needed.
- The client is a static Vite build (`npm run build --workspace client`) that can be served from any static host, pointed at the deployed server via `VITE_SERVER_URL` — note this is read at **build time**, not runtime, so it must be set before the client build runs.

### Deploying to Render

A `render.yaml` Blueprint is included at the repo root, defining two services: `ricochet-robots-server` (Node web service) and `ricochet-robots-client` (static site), wired together via Render's `fromService` env var references so each one's URL is passed to the other automatically.

To deploy:
1. On [Render](https://render.com), **New +** → **Blueprint**, and point it at this repo/branch.
2. Render will read `render.yaml` and propose both services — review and apply.
3. Once both are live, open the `ricochet-robots-client` URL — that's your shareable link.

If the Blueprint sync has issues (field names occasionally shift between Render API versions), set the two services up manually instead:
1. **New +** → **Web Service** for the server: Build Command `npm install`, Start Command `npm run start --workspace server`. Note its URL once deployed.
2. **New +** → **Static Site** for the client: Build Command `npm install && VITE_SERVER_URL=https://<server-url> npm run build --workspace client`, Publish Directory `client/dist`.
3. Back on the server service, add env var `CLIENT_ORIGIN=https://<client-url>` and save (triggers a redeploy).
4. Open the static site's URL.

Render's free tier spins down web services after 15 minutes idle, so the first request after a lull will be slow to wake up.
