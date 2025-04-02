# Acrophylia Game

A multiplayer creative word game built with Next.js and Socket.IO. Play with acronyms, historical dates, and movie plots!

## Setup
1. `npm install`
2. Run server: `npm run server`
3. Run app: `npm run dev`

## Game Types

### Acronyms
- Create phrases where each word starts with the given letters
- Example: For letters "C A T", you might submit "Cats Are Terrific"

### Historical Dates
- Create fictional historical events for random dates
- Example: For "March 15, 1872", you might submit "The first underground railway system was secretly tested"

### Movie Plots
- Create plot summaries for fictional movie titles
- Example: For "The Last Horizon", you might submit "A group of astronauts discover the edge of the universe"

## Game Rules
- Choose number of rounds (3, 5, 7, or 10)
- Select which game types to include
- Minimum 4 players (bots added if needed)
- Submit creative content based on the prompt
- Vote on submissions (can't vote for yourself)
- Most votes wins each round

## Tech Stack
- Next.js
- Socket.IO
- React
- OpenAI API (optional, for enhanced content generation)

acrophobia-game/
├── client/                 # Next.js frontend
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── GameLobby.jsx       # Game setup and options
│   │   │   ├── GameRoom.jsx        # Main game component
│   │   │   ├── PlayerList.jsx      # Display players and scores
│   │   │   ├── SubmissionForm.jsx  # Submit content for different game types
│   │   │   └── VotingPanel.jsx     # Vote on submissions
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
│   │   │   ├── gameLogic.js          # Core game mechanics
│   │   │   ├── contentGenerators.js   # Content generation for different game types
│   │   │   └── botLogic.js            # Bot player logic
│   │   └── server.js                  # Socket.IO server
│   ├── package.json
│   └── .env                           # Environment variables (OpenAI API key)
├── package.json          # Root package for managing both
└── README.md