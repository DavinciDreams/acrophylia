# Acrophylia Game

A multiplayer acronym game built with Next.js and Socket.IO.

## Setup
1. `npm install`
2. Run server: `npm run server`
3. Run app: `npm run dev`

## Rules
- 3 rounds (3, 4, 5 letters)
- Minimum 4 players (bots added if needed)
- Submit acronyms for random letters
- Vote on submissions (can't vote for yourself)
- Most votes wins each round

## Tech Stack
- Next.js
- Socket.IO
- React

acrophobia-game/
├── client/                 # Next.js frontend
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameLobby.jsx
│   │   │   ├── GameRoom.jsx
│   │   │   ├── PlayerList.jsx
│   │   │   ├── SubmissionForm.jsx
│   │   │   └── VotingPanel.jsx
│   │   ├── pages/
│   │   │   ├── index.jsx
│   │   │   └── _app.jsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   └── lib/
│   │       └── socket.js
│   ├── package.json
│   └── next.config.js
├── server/                # Express server
│   ├── src/
│   │   ├── utils/
│   │   │   ├── gameLogic.js
│   │   │   └── botLogic.js
│   │   └── server.js
│   ├── package.json
│   └── .env
├── package.json          # Root package for managing both
└── README.md