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
    return 'Random'; // Fallback category
  }
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
      started: false,
      timer: null
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
      if (room.timer) clearInterval(room.timer);
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
        if (room.timer) clearInterval(room.timer);
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
          if (room.timer) clearInterval(room.timer);
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
  room.started = true;
  io.to(roomId).emit('gameStarted');
  await startRound(roomId);
}

async function startRound(roomId) {
  const room = rooms.get(roomId);
  room.round++;
  const letters = generateLetters(room.round);
  const category = await generateCategory();
  room.category = category; // Store it here
  console.debug('Starting round', room.round, 'for room:', roomId, 'letters:', letters, 'category:', category);

  room.submissions.clear();
  room.votes.clear();

  const letterCount = letters.length;
  const timeLimit = letterCount <= 4 ? 30 : letterCount <= 6 ? 60 : 90;
  let timeLeft = timeLimit;

  io.to(roomId).emit('newRound', { roundNum: room.round, letterSet: letters, timeLeft, category });

  for (const player of room.players) {
    if (player.isBot) {
      const prompt = `Generate a creative acronym phrase using the letters ${letters.join(', ')} for the category "${category}". Return only the phrase, no explanation.`;
      try {
        const acronym = await callLLM(prompt);
        room.submissions.set(player.id, acronym);
        console.debug(`Bot ${player.name} submitted Grok acronym: ${acronym}`);
      } catch (error) {
        console.error(`Grok error for bot ${player.id}:`, error);
        room.submissions.set(player.id, letters.join(''));
      }
    }
  }

  room.timer = setInterval(() => {
    timeLeft--;
    io.to(roomId).emit('timeUpdate', { timeLeft });
    if (timeLeft <= 0) {
      clearInterval(room.timer);
      room.timer = null;
      for (const player of room.players) {
        if (!room.submissions.has(player.id)) {
          room.submissions.set(player.id, '');
          console.debug(`Auto-submitted blank for ${player.name || player.id} in room ${roomId}`);
        }
      }
      console.debug('Time up! All submissions received for room:', roomId);
      io.to(roomId).emit('submissionsReceived', Array.from(room.submissions));
      io.to(roomId).emit('votingStart');
      simulateBotVotes(roomId);
    } else if (room.submissions.size === room.players.length) {
      clearInterval(room.timer);
      room.timer = null;
      console.debug('All submissions received early for room:', roomId);
      io.to(roomId).emit('submissionsReceived', Array.from(room.submissions));
      io.to(roomId).emit('votingStart');
      simulateBotVotes(roomId);
    }
  }, 1000);
}

async function simulateBotVotes(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    const submissionList = Array.from(room.submissions).map(([id, acronym]) => ({
      id,
      acronym,
      playerName: room.players.find(p => p.id === id)?.name || id
    }));

    // Get the current category from the latest newRound emit (stored in client, but we’ll pass it via context)
    // For simplicity, assume category is available; in practice, store it in room object if needed
    const category = room.category || 'Random'; // Add category to room in startRound if persisting

    for (const player of room.players) {
      if (player.isBot && !room.votes.has(player.id)) {
        const validOptions = submissionList.filter(s => s.id !== player.id);
        if (validOptions.length > 0) {
          const prompt = `Rate these acronyms for creativity, humor, and fit to the category "${category}": ${validOptions.map((s, i) => `${i + 1}. ${s.acronym}`).join(', ')}. Return the number (1-${validOptions.length}) of the one you like best.`;
          try {
            const llmResponse = await callLLM(prompt);
            const choiceIndex = Math.min(parseInt(llmResponse) - 1 || 0, validOptions.length - 1);
            const votedId = validOptions[choiceIndex].id;
            room.votes.set(player.id, votedId);
            console.debug(`Bot ${player.name} voted for: ${validOptions[choiceIndex].acronym} by ${validOptions[choiceIndex].playerName} in category ${category}`);
          } catch (error) {
            console.error(`Grok voting error for bot ${player.id}:`, error);
            const randomVote = validOptions[Math.floor(Math.random() * validOptions.length)].id;
            room.votes.set(player.id, randomVote);
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

    if (room.round < 5) {
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
  console.log(`Server running on port ${PORT} - v1.0 with bots, chat, and xAI Grok`);
});