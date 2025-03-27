const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { OpenAI } = require('openai');
const { generateLetters } = require('./utils/gameLogic');
const { addBotPlayers } = require('./utils/botLogic');

require('dotenv').config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://urban-succotash-p9rqv5qxxg5cr4v4-3000.app.github.dev",
  "https://acrophylia-5sij2fzvc-davincidreams-projects.vercel.app",
  "https://acrophylia.vercel.app",
  "https://*.vercel.app",
  "https://acrophylia-plum.vercel.app"

];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send('Acrophobia Game Server is running. Connect via the frontend.');
});

const rooms = new Map();

const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

async function callLLM(prompt) {
  try {
    const response = await grokClient.chat.completions.create({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'You are a creative assistant helping generate acronyms or rate them.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('xAI API error:', error.message);
    throw error;
  }
}

async function generateCategory() {
  const prompt = 'Generate a single-word category for an acronym game (e.g., "Space", "Animals", "Tech"). Return only the word, no explanation.';
  try {
    const category = await callLLM(prompt);
    return category;
  } catch (error) {
    console.error('Category generation error:', error);
    return 'Random';
  }
}

io.on('connection', (socket) => {
  console.debug('New client connected:', socket.id);

  socket.on('createRoom', () => { // Removed roomName parameter
    const roomId = Math.random().toString(36).substr(2, 9);
    rooms.set(roomId, {
      name: `Room ${roomId}`, // Default name
      creatorId: socket.id,
      players: [{ id: socket.id, name: '', score: 0, isBot: false }],
      round: 0,
      letters: [],
      submissions: new Map(),
      votes: new Map(),
      started: false,
      submissionTimer: null,
      votingTimer: null,
      category: '',
    });
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('playerUpdate', { players: rooms.get(roomId).players, roomName: rooms.get(roomId).name });
  });

  socket.on('joinRoom', ({ roomId, creatorId }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = {
        name: `Room ${roomId}`,
        creatorId: null,
        players: [],
        round: 0,
        letters: [],
        submissions: new Map(),
        votes: new Map(),
        started: false,
        submissionTimer: null,
        votingTimer: null,
        category: '',
      };
      rooms.set(roomId, room);
    }

    const isOriginalCreator = creatorId && creatorId === room.creatorId;
    const playerExists = room.players.some(player => player.id === socket.id);

    if (isOriginalCreator && room.creatorId !== socket.id) {
      const oldCreatorIndex = room.players.findIndex(p => p.id === room.creatorId);
      if (oldCreatorIndex !== -1) {
        room.players[oldCreatorIndex].id = socket.id;
        room.creatorId = socket.id;
      }
    } else if (!playerExists) {
      room.players.push({ id: socket.id, name: '', score: 0, isBot: false });
    }

    if (!room.creatorId && room.players.length > 0) {
      room.creatorId = room.players[0].id;
    }

    socket.join(roomId);
    const isCreator = socket.id === room.creatorId;
    socket.emit('roomJoined', { roomId, isCreator, roomName: room.name });

    io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
    if (room.started) {
      socket.emit('gameStarted');
      if (room.round > 0) {
        socket.emit('newRound', {
          roundNum: room.round,
          letterSet: room.letters,
          timeLeft: room.submissionTimer
            ? Math.max(0, Math.floor((room.submissionTimer._idleStart + room.submissionTimer._idleTimeout - Date.now()) / 1000))
            : room.votingTimer
            ? Math.max(0, Math.floor((room.votingTimer._idleStart + room.votingTimer._idleTimeout - Date.now()) / 1000))
            : 0,
          category: room.category,
        });
        if (room.submissions.size > 0) {
          socket.emit('submissionsReceived', Array.from(room.submissions));
          if (room.votes.size > 0) socket.emit('votingStart');
        }
      }
    }
  });

  socket.on('setRoomName', ({ roomId, roomName }) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId && !room.started) {
      room.name = roomName.trim().substring(0, 20); // Sanitize and limit length
      io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
    }
  });

  socket.on('setName', ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isBot) {
        player.name = name.trim().substring(0, 20);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
      }
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId && !room.started) {
      room.started = true;
      startGame(roomId);
    }
  });

  socket.on('resetGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId) {
      if (room.submissionTimer) clearInterval(room.submissionTimer);
      if (room.votingTimer) clearInterval(room.votingTimer);
      room.round = 0;
      room.letters = [];
      room.submissions.clear();
      room.votes.clear();
      room.started = false;
      room.category = '';
      room.players.forEach(player => { player.score = 0 });
      io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
      io.to(roomId).emit('gameReset');
    }
  });

  socket.on('submitAcronym', ({ roomId, acronym }) => {
    const room = rooms.get(roomId);
    if (room && room.started) {
      room.submissions.set(socket.id, acronym);
      if (room.submissions.size === room.players.length) {
        if (room.submissionTimer) clearInterval(room.submissionTimer);
        startVoting(roomId);
      }
    }
  });

  socket.on('vote', ({ roomId, submissionId }) => {
    const room = rooms.get(roomId);
    if (room && room.started) {
      if (!room.votes.has(socket.id)) {
        room.votes.set(socket.id, submissionId);
        if (room.votes.size === room.players.length) {
          if (room.votingTimer) clearInterval(room.votingTimer);
          endVoting(roomId);
        }
      }
    }
  });

  socket.on('requestResults', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.votes.size === room.players.length) {
      const results = calculateResults(room);
      socket.emit('roundResults', results);
    }
  });

  socket.on('sendMessage', ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const senderName = player.name || socket.id;
        io.to(roomId).emit('chatMessage', { senderId: socket.id, senderName, message });
      }
    }
  });

  socket.on('leaveRoom', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.leave(roomId);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
        if (socket.id === room.creatorId && room.players.length > 0) {
          room.creatorId = room.players[0].id;
          io.to(roomId).emit('creatorUpdate', room.creatorId);
        }
      }
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
        if (socket.id === room.creatorId && room.players.length > 0) {
          room.creatorId = room.players[0].id;
          io.to(roomId).emit('creatorUpdate', room.creatorId);
        }
      }
    });
  });
});

async function startGame(roomId) {
  const room = rooms.get(roomId);
  while (room.players.length < 4) {
    room.players = addBotPlayers(room.players, 1);
    const newBot = room.players[room.players.length - 1];
    io.to(roomId).emit('chatMessage', {
      senderId: newBot.id,
      senderName: newBot.name,
      message: `${newBot.name} has joined the chat!`
    });
  }
  io.to(roomId).emit('playerUpdate', { players: room.players, roomName: room.name });
  room.started = true;
  io.to(roomId).emit('gameStarted');
  await startRound(roomId);
}

async function startRound(roomId) {
  const room = rooms.get(roomId);
  room.round++;
  room.letters = generateLetters(room.round);
  const category = await generateCategory();
  room.category = category;
  console.debug('Starting round', room.round, 'for room:', roomId, 'letters:', room.letters, 'category:', category);

  room.submissions.clear();
  room.votes.clear();

  const letterCount = room.letters.length;
  const timeLimit = letterCount <= 4 ? 30 : letterCount <= 6 ? 60 : 90;
  let timeLeft = timeLimit;

  io.to(roomId).emit('newRound', { roundNum: room.round, letterSet: room.letters, timeLeft, category });

  for (const player of room.players) {
    if (player.isBot) {
      const prompt = `Generate a creative acronym phrase using the letters ${room.letters.join(', ')} for the category "${category}". Return only the phrase, no explanation.`;
      try {
        const acronym = await callLLM(prompt);
        room.submissions.set(player.id, acronym);
      } catch (error) {
        room.submissions.set(player.id, room.letters.join(''));
      }
    }
  }

  room.submissionTimer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timeUpdate', { timeLeft });
    if (timeLeft <= 0 || room.submissions.size === room.players.length) {
      clearInterval(room.submissionTimer);
      room.submissionTimer = null;
      for (const player of room.players) {
        if (!room.submissions.has(player.id)) room.submissions.set(player.id, '');
      }
      startVoting(roomId);
    }
  }, 1000);
}

function startVoting(roomId) {
  const room = rooms.get(roomId);
  io.to(roomId).emit('submissionsReceived', Array.from(room.submissions));
  io.to(roomId).emit('votingStart');

  const letterCount = room.letters.length;
  const timeLimit = letterCount <= 4 ? 30 : letterCount <= 6 ? 60 : 90;
  let timeLeft = timeLimit;

  setTimeout(() => simulateBotVotes(roomId), 5000);

  room.votingTimer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timeUpdate', { timeLeft });
    if (timeLeft <= 0 || room.votes.size === room.players.length) {
      clearInterval(room.votingTimer);
      room.votingTimer = null;
      endVoting(roomId);
    }
  }, 1000);
}

async function simulateBotVotes(roomId) {
  const room = rooms.get(roomId);
  if (room && room.votingTimer) {
    const submissionList = Array.from(room.submissions).map(([id, acronym]) => ({
      id,
      acronym,
      playerName: room.players.find(p => p.id === id)?.name || id
    }));

    for (const player of room.players) {
      if (player.isBot && !room.votes.has(player.id)) {
        const validOptions = submissionList.filter(s => s.id !== player.id);
        if (validOptions.length > 0) {
          const prompt = `Rate these acronyms for creativity, humor, and fit to the category "${room.category}": ${validOptions.map((s, i) => `${i + 1}. ${s.acronym}`).join(', ')}. Return the number (1-${validOptions.length}) of the one you like best.`;
          try {
            const llmResponse = await callLLM(prompt);
            const choiceIndex = Math.min(parseInt(llmResponse) - 1 || 0, validOptions.length - 1);
            const votedId = validOptions[choiceIndex].id;
            room.votes.set(player.id, votedId);
            if (room.votes.size === room.players.length) {
              if (room.votingTimer) clearInterval(room.votingTimer);
              endVoting(roomId);
            }
          } catch (error) {
            const randomVote = validOptions[Math.floor(Math.random() * validOptions.length)].id;
            room.votes.set(player.id, randomVote);
            if (room.votes.size === room.players.length) {
              if (room.votingTimer) clearInterval(room.votingTimer);
              endVoting(roomId);
            }
          }
        }
      }
    }
  }
}

function endVoting(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    for (const player of room.players) {
      if (!room.votes.has(player.id)) room.votes.set(player.id, '');
    }
    const results = calculateResults(room);
    io.to(roomId).emit('roundResults', results);

    if (room.round < 5) {
      room.submissions.clear();
      room.votes.clear();
      startRound(roomId);
    } else {
      const winner = room.players.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
      io.to(roomId).emit('gameEnd', { winner });
    }
  }
}

function calculateResults(room) {
  const voteCounts = new Map();
  room.votes.forEach((votedId) => {
    if (votedId) voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1);
  });

  voteCounts.forEach((count, playerId) => {
    const player = room.players.find(p => p.id === playerId);
    if (player) player.score += count;
  });

  return {
    submissions: Array.from(room.submissions),
    votes: Array.from(room.votes),
    updatedPlayers: room.players
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - v1.0 with custom room name UI`);
});