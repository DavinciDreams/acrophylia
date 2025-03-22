const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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
  origin: (origin, callback) => {
    console.log('CORS check - Origin:', origin);
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => o.includes('*') && origin.match(o.replace('*', '.*')))) {
      callback(null, true);
    } else {
      console.warn('CORS rejected - Origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST"],
  credentials: true,
}));

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log('Socket.IO CORS check - Origin:', origin);
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => o.includes('*') && origin.match(o.replace('*', '.*')))) {
        callback(null, true);
      } else {
        console.warn('Socket.IO CORS rejected - Origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 5000,
});

app.get('/', (req, res) => {
  res.send('Acrophobia Game Server is running. Connect via the frontend.');
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('createRoom', (roomName) => {
    console.log('Received createRoom event with name:', roomName, 'from:', socket.id);
    const roomId = Math.random().toString(36).substr(2, 9);
    rooms.set(roomId, {
      name: roomName,
      creatorId: socket.id,
      players: [{ id: socket.id, score: 0, isBot: false }],
      round: 0,
      submissions: new Map(),
      votes: new Map(),
      started: false,
    });
    socket.join(roomId);
    console.log('Created room:', roomId, 'creatorId:', socket.id, 'Rooms size:', rooms.size);
    socket.emit('roomCreated', roomId);
    io.to(roomId).emit('playerUpdate', rooms.get(roomId).players);
  });

  socket.on('joinRoom', ({ roomId, creatorId }) => {
    console.log('Received joinRoom event for room:', roomId, 'from:', socket.id, 'creatorId provided:', creatorId);
    const room = rooms.get(roomId);
    if (room) {
      const isOriginalCreator = creatorId && creatorId === room.creatorId;
      const playerExists = room.players.some(player => player.id === socket.id);

      if (isOriginalCreator && room.creatorId !== socket.id) {
        const oldCreatorIndex = room.players.findIndex(p => p.id === room.creatorId);
        if (oldCreatorIndex !== -1) {
          console.log('Updating creator ID from:', room.creatorId, 'to:', socket.id);
          room.players[oldCreatorIndex].id = socket.id;
          room.creatorId = socket.id;
        }
        socket.join(roomId);
      } else if (!playerExists) {
        room.players.push({ id: socket.id, score: 0, isBot: false });
        socket.join(roomId);
        console.log('Player joined room:', roomId, 'Total players:', room.players.length);
      } else {
        console.log('Player', socket.id, 'already in room:', roomId);
      }

      const isCreator = socket.id === room.creatorId;
      console.log('Sending roomJoined, roomId:', roomId, 'socket.id:', socket.id, 'room.creatorId:', room.creatorId, 'isCreator:', isCreator);
      socket.emit('roomJoined', { roomId, isCreator });
      io.to(roomId).emit('playerUpdate', room.players);
    } else {
      console.warn('Room not found on join:', roomId, 'Available rooms:', Array.from(rooms.keys()));
      socket.emit('roomNotFound');
    }
  });

  socket.on('startGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId && !room.started) {
      console.log('Received startGame event for room:', roomId, 'from:', socket.id);
      room.started = true;
      startGame(roomId);
    } else {
      console.warn('Start game rejected:', socket.id, 'not creator or game already started');
    }
  });

  socket.on('resetGame', (roomId) => {
    const room = rooms.get(roomId);
    if (room && socket.id === room.creatorId) {
      console.log('Resetting game for room:', roomId, 'from:', socket.id);
      room.round = 0;
      room.submissions.clear();
      room.votes.clear();
      room.started = false;
      room.players.forEach(player => { player.score = 0 });
      io.to(roomId).emit('playerUpdate', room.players);
      io.to(roomId).emit('gameReset');
    } else {
      console.warn('Reset game rejected:', socket.id, 'not creator');
    }
  });

  socket.on('submitAcronym', ({ roomId, acronym }) => {
    console.log('Received submitAcronym for room:', roomId, 'acronym:', acronym);
    const room = rooms.get(roomId);
    if (room && room.started) {
      room.submissions.set(socket.id, acronym);
      console.log('Current submissions:', room.submissions.size, 'Players:', room.players.length);
      if (room.submissions.size === room.players.length) {
        console.log('All submissions received for room:', roomId);
        io.to(roomId).emit('submissionsReceived', Array.from(room.submissions));
        io.to(roomId).emit('votingStart');
        simulateBotVotes(roomId);
      }
    }
  });

  socket.on('vote', ({ roomId, submissionId }) => {
    console.log('Received vote for room:', roomId, 'submission:', submissionId);
    const room = rooms.get(roomId);
    if (room && room.started) {
      if (!room.votes.has(socket.id)) {
        room.votes.set(socket.id, submissionId);
        console.log('Current votes:', room.votes.size, 'Players:', room.players.length);
        if (room.votes.size === room.players.length) {
          console.log('All votes received for room:', roomId);
          const results = calculateResults(room);
          io.to(roomId).emit('roundResults', results);
          
          if (room.round < 3) {
            room.submissions.clear();
            room.votes.clear();
            startRound(roomId);
          } else {
            const winners = calculateWinners(room.players);
            console.log('Game ended, winners:', winners.map(w => w.id));
            io.to(roomId).emit('gameEnd', { winners });
          }
        }
      } else {
        console.log('Player', socket.id, 'already voted in room:', roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        console.log('Player removed from room:', roomId, 'Remaining players:', room.players.length);
        io.to(roomId).emit('playerUpdate', room.players);
        if (room.players.length === 0) {
          rooms.delete(roomId);
          console.log('Room deleted:', roomId);
        }
      }
    });
  });
});

function startGame(roomId) {
  const room = rooms.get(roomId);
  console.log('Starting game for room:', roomId, 'Current players:', room.players.length);
  while (room.players.length < 4) {
    room.players = addBotPlayers(room.players, 1);
    console.log('Added bot, new player count:', room.players.length);
  }
  io.to(roomId).emit('playerUpdate', room.players);
  startRound(roomId);
}

function startRound(roomId) {
  const room = rooms.get(roomId);
  room.round++;
  const letters = generateLetters(room.round);
  console.log('Starting round', room.round, 'for room:', roomId, 'letters:', letters);
  
  room.submissions.clear();
  
  room.players.forEach(player => {
    if (player.isBot) {
      const botAcronym = letters.join('');
      room.submissions.set(player.id, botAcronym);
      console.log('Bot', player.id, 'submitted:', botAcronym);
    }
  });
  
  io.to(roomId).emit('newRound', { roundNum: room.round, letterSet: letters });
}

function simulateBotVotes(roomId) {
  const room = rooms.get(roomId);
  if (room) {
    const submissionIds = Array.from(room.submissions.keys());
    room.players.forEach(player => {
      if (player.isBot && !room.votes.has(player.id)) {
        const randomVote = submissionIds[Math.floor(Math.random() * submissionIds.length)];
        room.votes.set(player.id, randomVote);
        console.log('Bot', player.id, 'voted for:', randomVote);
      }
    });
    if (room.votes.size === room.players.length) {
      console.log('All votes received for room:', roomId);
      const results = calculateResults(room);
      io.to(roomId).emit('roundResults', results);
      
      if (room.round < 3) {
        room.submissions.clear();
        room.votes.clear();
        startRound(roomId);
      } else {
        const winners = calculateWinners(room.players);
        console.log('Game ended, winners:', winners.map(w => w.id));
        io.to(roomId).emit('gameEnd', { winners });
      }
    }
  }
}

function calculateResults(room) {
  const voteCounts = new Map();
  room.votes.forEach((votedId) => {
    voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1);
  });
  
  let maxVotes = 0;
  const roundWinners = [];
  voteCounts.forEach((count, id) => {
    if (count > maxVotes) {
      maxVotes = count;
      roundWinners.length = 0;
      roundWinners.push(id);
    } else if (count === maxVotes) {
      roundWinners.push(id);
    }
  });

  roundWinners.forEach(winnerId => {
    const winner = room.players.find(p => p.id === winnerId);
    if (winner) winner.score += 1;
  });

  console.log('Round results for room:', room.name, 'winners:', roundWinners, 'scores:', room.players.map(p => ({ id: p.id, score: p.score })));
  return {
    submissions: Array.from(room.submissions),
    votes: Array.from(room.votes),
    winnerIds: roundWinners,
    updatedPlayers: room.players,
  };
}

function calculateWinners(players) {
  let maxScore = 0;
  const winners = [];
  players.forEach(player => {
    if (player.score > maxScore) {
      maxScore = player.score;
      winners.length = 0;
      winners.push(player);
    } else if (player.score === maxScore) {
      winners.push(player);
    }
  });
  return winners;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} - v1.0 with bots`);
});