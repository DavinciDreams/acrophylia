const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios'); // Add for API calls
const { generateLetters } = require('./utils/gameLogic');
const { addBotPlayers } = require('./utils/botLogic');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "https://urban-succotash-p9rqv5qxxg5cr4v4-3000.app.github.dev",
  "https://acrophylia-5sij2fzvc-davincidreams-projects.vercel.app",
  "https://acrophylia.vercel.app",
  "https://*.vercel.app"
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

// Mock LLM function (replace with real API call)
async function callLLM(prompt) {
  // Simulate LLM response for now
  // Real implementation: axios.post('https://api.x.ai/v1/completions', { prompt, ... })
  return new Promise((resolve) => {
    setTimeout(() => {
      if (prompt.includes('Generate an acronym')) {
        const letters = prompt.match(/[A-Z]/g).join('');
        resolve(`${letters} means "${letters.split('').map(l => `${l}omething`).join(' ')}"`);
      } else if (prompt.includes('Rate these acronyms')) {
        resolve('I like the second one best!');
      }
    }, 500); // Fake delay
  });
}

io.on('connection', (socket) => {
  console.debug('New client connected:', socket.id);

  socket.on('createRoom', (roomName) => {
    const roomId = Math.random().toString(36).substr(2, 9);
    rooms.set(roomId, {
      name: roomName,
      creatorId: socket.id,
      players: [{ id: socket.id, name: '', score: 0, isBot: false }],
      round: 0,
      submissions: new Map(),
      votes: new Map(),
      started: false
    });
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('playerUpdate', rooms.get(roomId).players);
  });

  socket.on('joinRoom', ({ roomId, creatorId }) => {
    const room = rooms.get(roomId);
    if (room) {
      const isOriginalCreator = creatorId && creatorId === room.creatorId;
      const playerExists = room.players.some(player => player.id === socket.id);

      if (isOriginalCreator && room.creatorId !== socket.id) {
        const oldCreatorIndex = room.players.findIndex(p => p.id === room.creatorId);
        if (oldCreatorIndex !== -1) {
          room.players[oldCreatorIndex].id = socket.id;
          room.creatorId = socket.id;
        }
        socket.join(roomId);
      } else if (!playerExists) {
        room.players.push({ id: socket.id, name: '', score: 0, isBot: false });
        socket.join(roomId);
      }

      const isCreator = socket.id === room.creatorId;
      socket.emit('roomJoined', { roomId, isCreator });
      io.to(roomId).emit('playerUpdate', room.players);
    } else {
      socket.emit('roomNotFound');
    }
  });

  socket.on('setName', ({ roomId, name }) => {
    const room = rooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && !player.isBot) {
        player.name = name.trim().substring(0, 20);
        console.debug(`Player ${socket.id} set name to: ${player.name}`);
        io.to(roomId).emit('playerUpdate', room.players);
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
      room.round = 0;
      room.submissions.clear();
      room.votes.clear();
      room.started = false;
      room.players.forEach(player => { player.score = 0 });
      io.to(roomId).emit('playerUpdate', room.players);
      io.to(roomId).emit('gameReset');
    }
  });

  socket.on('submitAcronym', ({ roomId, acronym }) => {
    console.debug('Received submitAcronym for room:', roomId, 'acronym:', acronym);
    const room = rooms.get(roomId);
    if (room && room.started) {
      room.submissions.set(socket.id, acronym);
      console.debug('Current submissions:', room.submissions.size, 'Players:', room.players.length);
      if (room.submissions.size === room.players.length) {
        console.debug('All submissions received for room:', roomId);
        io.to(roomId).emit('submissionsReceived', Array.from(room.submissions));
        io.to(roomId).emit('votingStart');
        simulateBotVotes(roomId);
      }
    }
  });

  socket.on('vote', ({ roomId, submissionId }) => {
    console.debug('Received vote for room:', roomId, 'submission:', submissionId);
    const room = rooms.get(roomId);
    if (room && room.started) {
      if (!room.votes.has(socket.id)) {
        room.votes.set(socket.id, submissionId);
        console.debug('Current votes:', room.votes.size, 'Players:', room.players.length);
        checkAllVotes(roomId);
      } else {
        console.debug('Player', socket.id, 'already voted in room:', roomId);
      }
    }
  });

  socket.on('requestResults', (roomId) => {
    console.debug('Client requested results for room:', roomId);
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
        console.debug(`Chat message from ${senderName} in room ${roomId}: ${message}`);
        io.to(roomId).emit('chatMessage', { senderId: socket.id, senderName, message });
      }
    }
  });

  socket.on('disconnect', () => {
    console.debug('Client disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        io.to(roomId).emit('playerUpdate', room.players);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

async function startGame(roomId) {
  const room = rooms.get(roomId);
  console.debug('Starting game for room:', roomId, 'Current players:', room.players.length);
  while (room.players.length < 4) {
    room.players = addBotPlayers(room.players, 1);
    const newBot = room.players[room.players.length - 1];
    io.to(roomId).emit('chatMessage', {
      senderId: newBot.id,
      senderName: newBot.name,
      message: `${newBot.name} has joined the chat!`
    });
  }
  io.to(roomId).emit('playerUpdate', room.players);
  await startRound(roomId);
}

async function startRound(roomId) {
  const room = rooms.get(roomId);
  room.round++;
  const letters = generateLetters(room.round);
  console.debug('Starting round', room.round, 'for room:', roomId, 'letters:', letters);

  room.submissions.clear();
  room.votes.clear();

  // Bot acronym generation with LLM
  for (const player of room.players) {
    if (player.isBot) {
      const prompt = `Generate an acronym using the letters ${letters.join(', ')}. Provide a creative phrase.`;
      try {
        const llmResponse = await callLLM(prompt);
        const acronymMatch = llmResponse.match(/"([^"]+)"/); // Extract phrase from mock response
        const acronym = acronymMatch ? acronymMatch[1] : letters.join(''); // Fallback to letters
        room.submissions.set(player.id, acronym);
        console.debug(`Bot ${player.name} submitted LLM acronym: ${acronym}`);
      } catch (error) {
        console.error(`LLM error for bot ${player.id}:`, error);
        room.submissions.set(player.id, letters.join('')); // Fallback
      }
    }
  }

  io.to(roomId).emit('newRound', { roundNum: room.round, letterSet: letters });
}

async function simulateBotVotes(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    const submissionList = Array.from(room.submissions).map(([id, acronym]) => ({
      id,
      acronym,
      playerName: room.players.find(p => p.id === id)?.name || id
    }));

    for (const player of room.players) {
      if (player.isBot && !room.votes.has(player.id)) {
        const validOptions = submissionList.filter(s => s.id !== player.id);
        if (validOptions.length > 0) {
          const prompt = `Rate these acronyms for creativity and humor: ${validOptions.map((s, i) => `${i + 1}. ${s.acronym}`).join(', ')}. Which one do you like best?`;
          try {
            const llmResponse = await callLLM(prompt);
            const choiceMatch = llmResponse.match(/second|first|third|[0-9]+/i); // Parse response
            const choiceIndex = choiceMatch ? (parseInt(choiceMatch[0]) - 1) || 1 : 0; // Default to first if unclear
            const votedId = validOptions[Math.min(choiceIndex, validOptions.length - 1)].id;
            room.votes.set(player.id, votedId);
            console.debug(`Bot ${player.name} voted for: ${validOptions[choiceIndex]?.acronym} by ${validOptions[choiceIndex]?.playerName}`);
          } catch (error) {
            console.error(`LLM voting error for bot ${player.id}:`, error);
            const randomVote = validOptions[Math.floor(Math.random() * validOptions.length)].id;
            room.votes.set(player.id, randomVote); // Fallback to random
          }
        } else {
          console.debug(`Bot ${player.name} found no valid vote options`);
        }
      }
    }
    console.debug('After bot votes - Current votes:', room.votes.size, 'Players:', room.players.length);
    checkAllVotes(roomId);
  }
}

function checkAllVotes(roomId) {
  const room = rooms.get(roomId);
  if (room && room.votes.size === room.players.length) {
    console.debug('All votes received for room:', roomId);
    const results = calculateResults(room);
    io.to(roomId).emit('roundResults', results);

    if (room.round < 3) {
      room.submissions.clear();
      room.votes.clear();
      startRound(roomId);
    } else {
      const winner = room.players.reduce((prev, curr) =>
        prev.score > curr.score ? prev : curr
      );
      console.debug('Game ended, winner:', winner.id, 'with score:', winner.score);
      io.to(roomId).emit('gameEnd', { winner });
    }
  }
}

function calculateResults(room) {
  const voteCounts = new Map();
  room.votes.forEach((votedId) => {
    voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1);
  });

  voteCounts.forEach((count, playerId) => {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score += count;
    }
  });

  const results = {
    submissions: Array.from(room.submissions),
    votes: Array.from(room.votes),
    updatedPlayers: room.players
  };
  console.debug('Calculated results for room:', room.name, 'results:', JSON.stringify(results));
  return results;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - v1.0 with bots, chat, and LLM`);
});