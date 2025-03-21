const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const { generateLetters, checkMinPlayers } = require('./utils/gameLogic')
const { addBotPlayers } = require('./utils/botLogic')

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", // Keep for local dev
      "https://urban-succotash-p9rqv5qxxg5cr4v4-3000.app.github.dev", // Your Codespaces URL
      "https://acrophylia.vercel.app/" // Add your Vercel URL if deployed there
    ],
    methods: ["GET", "POST"]
  }
})

app.use(cors())

app.get('/', (req, res) => {
  res.send('Acrophobia Game Server is running. Connect via the frontend.')
})

const rooms = new Map()

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id)

  socket.on('createRoom', (roomName) => {
    console.log('Received createRoom event with name:', roomName)
    const roomId = Math.random().toString(36).substr(2, 9)
    rooms.set(roomId, {
      name: roomName,
      players: [{ id: socket.id, score: 0 }],
      round: 0,
      submissions: new Map(),
      votes: new Map()
    })
    socket.join(roomId)
    console.log('Created room:', roomId)
    socket.emit('roomCreated', roomId)
  })

  socket.on('joinRoom', (roomId) => {
    console.log('Received joinRoom event for room:', roomId)
    const room = rooms.get(roomId)
    if (room) {
      room.players.push({ id: socket.id, score: 0 })
      socket.join(roomId)
      io.to(roomId).emit('playerUpdate', room.players)
      console.log('Player joined room:', roomId, 'Total players:', room.players.length)
      
      if (room.players.length === 1) startGame(roomId)
    } else {
      console.log('Room not found:', roomId)
    }
  })

  socket.on('submitAcronym', ({ roomId, acronym }) => {
    console.log('Received submitAcronym for room:', roomId, 'acronym:', acronym)
    const room = rooms.get(roomId)
    room.submissions.set(socket.id, acronym)
    if (room.submissions.size === room.players.length) {
      console.log('All submissions received for room:', roomId)
      io.to(roomId).emit('submissionsReceived', Array.from(room.submissions))
      io.to(roomId).emit('votingStart')
    }
  })

  socket.on('vote', ({ roomId, submissionId }) => {
    console.log('Received vote for room:', roomId, 'submission:', submissionId)
    const room = rooms.get(roomId)
    room.votes.set(socket.id, submissionId)
    
    if (room.votes.size === room.players.length) {
      console.log('All votes received for room:', roomId)
      const results = calculateResults(room)
      io.to(roomId).emit('roundResults', results)
      
      if (room.round < 3) {
        room.submissions.clear()
        room.votes.clear()
        startRound(roomId)
      } else {
        const winner = room.players.reduce((prev, curr) => 
          prev.score > curr.score ? prev : curr
        )
        console.log('Game ended, winner:', winner.id)
        io.to(roomId).emit('gameEnd', { winner })
      }
    }
  })
})

function startGame(roomId) {
  const room = rooms.get(roomId)
  console.log('Starting game for room:', roomId)
  if (!checkMinPlayers(room.players)) {
    room.players = addBotPlayers(room.players)
    io.to(roomId).emit('playerUpdate', room.players)
    console.log('Added bots to room:', roomId, 'New player count:', room.players.length)
  }
  startRound(roomId)
}

function startRound(roomId) {
  const room = rooms.get(roomId)
  room.round++
  const letters = generateLetters(room.round)
  console.log('Starting round', room.round, 'for room:', roomId, 'letters:', letters)
  io.to(roomId).emit('newRound', { roundNum: room.round, letterSet: letters })
}

function calculateResults(room) {
  const voteCounts = new Map()
  room.votes.forEach((votedId) => {
    voteCounts.set(votedId, (voteCounts.get(votedId) || 0) + 1)
  })
  
  let winnerId = null
  let maxVotes = 0
  voteCounts.forEach((count, id) => {
    if (count > maxVotes) {
      maxVotes = count
      winnerId = id
    }
  })

  const winner = room.players.find(p => p.id === winnerId)
  if (winner) winner.score += 1

  console.log('Calculated results for room:', room.name, 'winner:', winnerId)
  return {
    submissions: Array.from(room.submissions),
    votes: Array.from(room.votes),
    winnerId,
    updatedPlayers: room.players
  }
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})