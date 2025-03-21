const { Server } = require('socket.io')
const { generateLetters, checkMinPlayers } = require('../utils/gameLogic')
const { addBotPlayers } = require('../utils/botLogic')

const io = new Server()

const rooms = new Map()

io.on('connection', (socket) => {
  socket.on('createRoom', (roomName) => {
    const roomId = Math.random().toString(36).substr(2, 9)
    rooms.set(roomId, {
      name: roomName,
      players: [{ id: socket.id, score: 0 }],
      round: 0,
      submissions: new Map(),
      votes: new Map()
    })
    socket.join(roomId)
    socket.emit('roomCreated', roomId)
  })

  socket.on('joinRoom', (roomId) => {
    const room = rooms.get(roomId)
    if (room) {
      room.players.push({ id: socket.id, score: 0 })
      socket.join(roomId)
      io.to(roomId).emit('playerUpdate', room.players)
      
      if (room.players.length === 1) startGame(roomId)
    }
  })

  socket.on('submitAcronym', ({ roomId, acronym }) => {
    const room = rooms.get(roomId)
    room.submissions.set(socket.id, acronym)
    if (room.submissions.size === room.players.length) {
      io.to(roomId).emit('submissionsReceived', Array.from(room.submissions))
      io.to(roomId).emit('votingStart')
    }
  })

  socket.on('vote', ({ roomId, submissionId }) => {
    const room = rooms.get(roomId)
    room.votes.set(socket.id, submissionId)
    
    if (room.votes.size === room.players.length) {
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
        io.to(roomId).emit('gameEnd', { winner })
      }
    }
  })
})

function startGame(roomId) {
  const room = rooms.get(roomId)
  if (!checkMinPlayers(room.players)) {
    room.players = addBotPlayers(room.players)
    io.to(roomId).emit('playerUpdate', room.players)
  }
  startRound(roomId)
}

function startRound(roomId) {
  const room = rooms.get(roomId)
  room.round++
  const letters = generateLetters(room.round)
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

  return {
    submissions: Array.from(room.submissions),
    votes: Array.from(room.votes),
    winnerId,
    updatedPlayers: room.players
  }
}

io.listen(3001)