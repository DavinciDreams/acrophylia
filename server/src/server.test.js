/**
 * Tests for server game type functionality
 */
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { createServer } = require('http');

// Mock the content generators
jest.mock('./utils/contentGenerators', () => ({
  generateContent: jest.fn().mockImplementation((gameType, round) => {
    if (gameType === 'acronym') {
      return Promise.resolve({
        content: ['A', 'B', 'C'],
        category: 'Animals',
        type: 'acronym'
      });
    } else if (gameType === 'date') {
      return Promise.resolve({
        content: 'January 1, 1900',
        category: 'Historical Event',
        type: 'date'
      });
    } else if (gameType === 'movie') {
      return Promise.resolve({
        content: 'The Last Horizon',
        category: 'Movie Plot',
        type: 'movie'
      });
    }
  }),
  generateBotSubmission: jest.fn().mockImplementation((gameType) => {
    return Promise.resolve(`Bot submission for ${gameType}`);
  })
}));

describe('Server Game Type Tests', () => {
  let io, serverSocket, clientSocket, httpServer;
  
  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    // Create Socket.IO server
    io = new Server(httpServer);
    // Start server
    httpServer.listen(() => {
      // Get the port
      const port = httpServer.address().port;
      // Connect client
      clientSocket = new Client(`http://localhost:${port}`);
      
      // Set up server-side socket handlers
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
    
    // Import server code (this will use the mocked contentGenerators)
    require('./server');
  });
  
  afterAll(() => {
    // Clean up
    io.close();
    clientSocket.close();
    httpServer.close();
  });
  
  test('should set game options with multiple game types', (done) => {
    // Create a room first
    clientSocket.emit('createRoom');
    
    // Listen for room creation confirmation
    clientSocket.once('roomCreated', ({ roomId }) => {
      // Set game options
      clientSocket.emit('setGameOptions', {
        roomId,
        rounds: 5,
        gameTypes: ['acronym', 'date', 'movie']
      });
      
      // Listen for options confirmation
      clientSocket.once('gameOptionsSet', (data) => {
        expect(data.rounds).toBe(5);
        expect(data.gameTypes).toEqual(['acronym', 'date', 'movie']);
        done();
      });
    });
  });
  
  test('should start game with random game type from selected options', (done) => {
    // Create a room first
    clientSocket.emit('createRoom');
    
    // Listen for room creation confirmation
    clientSocket.once('roomCreated', ({ roomId }) => {
      // Set game options
      clientSocket.emit('setGameOptions', {
        roomId,
        rounds: 3,
        gameTypes: ['acronym', 'date', 'movie']
      });
      
      // Start the game
      clientSocket.emit('startGame', { roomId });
      
      // Listen for new round event
      clientSocket.once('newRound', (data) => {
        expect(data.roundNum).toBe(1);
        expect(['acronym', 'date', 'movie']).toContain(data.gameType);
        expect(data.content).toBeDefined();
        expect(data.category).toBeDefined();
        done();
      });
    });
  });
  
  test('should handle content submission for different game types', (done) => {
    // Create a room first
    clientSocket.emit('createRoom');
    
    // Listen for room creation confirmation
    clientSocket.once('roomCreated', ({ roomId }) => {
      // Set name
      clientSocket.emit('setName', { roomId, name: 'TestPlayer' });
      
      // Set game options with only acronym type
      clientSocket.emit('setGameOptions', {
        roomId,
        rounds: 3,
        gameTypes: ['acronym']
      });
      
      // Start the game
      clientSocket.emit('startGame', { roomId });
      
      // Listen for new round event
      clientSocket.once('newRound', (data) => {
        // Submit content
        clientSocket.emit('submitContent', { 
          roomId, 
          submission: 'Amazing Beautiful Creatures' 
        });
        
        // Listen for submission confirmation
        clientSocket.once('submissionReceived', () => {
          done();
        });
      });
    });
  });
  
  test('should handle backward compatibility with submitAcronym', (done) => {
    // Create a room first
    clientSocket.emit('createRoom');
    
    // Listen for room creation confirmation
    clientSocket.once('roomCreated', ({ roomId }) => {
      // Set name
      clientSocket.emit('setName', { roomId, name: 'TestPlayer' });
      
      // Set game options with only acronym type
      clientSocket.emit('setGameOptions', {
        roomId,
        rounds: 3,
        gameTypes: ['acronym']
      });
      
      // Start the game
      clientSocket.emit('startGame', { roomId });
      
      // Listen for new round event
      clientSocket.once('newRound', (data) => {
        // Submit using old method
        clientSocket.emit('submitAcronym', { 
          roomId, 
          acronym: 'Amazing Beautiful Creatures' 
        });
        
        // Listen for submission confirmation
        clientSocket.once('submissionReceived', () => {
          done();
        });
      });
    });
  });
});
