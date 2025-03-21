import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Head from 'next/head';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 30000,
});

const GameRoom = () => {
  const router = useRouter();
  const { roomId: urlRoomId, creatorId } = router.query;
  const [roomId, setRoomId] = useState(urlRoomId || null);
  const [players, setPlayers] = useState([]);
  const [roundNum, setRoundNum] = useState(0);
  const [letterSet, setLetterSet] = useState([]);
  const [acronym, setAcronym] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [playerName, setPlayerName] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCreator = sessionStorage.getItem('isCreator') === 'true';
      setIsCreator(storedCreator);
      console.debug('Initial isCreator from sessionStorage:', storedCreator);
    }

    if (!urlRoomId || hasJoined) return;

    socket.on('connect', () => {
      console.debug('Socket connected, ID:', socket.id);
      setIsConnected(true);
      if (urlRoomId && !hasJoined) {
        console.debug('Joining/Rejoining room:', urlRoomId, 'with creatorId:', creatorId);
        socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
      }
    });

    socket.on('disconnect', () => {
      console.debug('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => console.error('Socket connect error:', err.message));
    socket.on('reconnect', (attempt) => console.debug('Socket reconnected after attempt:', attempt));
    socket.on('reconnect_error', (err) => console.error('Socket reconnect error:', err.message));

    socket.on('roomJoined', ({ roomId, isCreator: serverIsCreator }) => {
      console.debug('Room joined, roomId:', roomId, 'serverIsCreator:', serverIsCreator, 'socket.id:', socket.id);
      setRoomId(roomId);
      if (!isCreator && serverIsCreator) setIsCreator(serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      console.warn('Room not found for roomId:', urlRoomId);
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', (updatedPlayers) => {
      console.debug('Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
      const currentPlayer = updatedPlayers.find(p => p.id === socket.id);
      if (currentPlayer && currentPlayer.name) setNameSet(true);
    });

    socket.on('newRound', ({ roundNum, letterSet }) => {
      console.debug('New round started:', roundNum, letterSet);
      setRoundNum(roundNum);
      setLetterSet(letterSet);
      setGameState('submitting');
      setSubmissions([]);
      setHasVoted(false);
      setResults(null);
    });

    socket.on('submissionsReceived', (submissionList) => {
      console.debug('Submissions received:', submissionList);
      setSubmissions(submissionList);
      setGameState('voting');
    });

    socket.on('votingStart', () => {
      console.debug('Voting started');
      setGameState('voting');
    });

    socket.on('roundResults', (roundResults) => {
      console.debug('Round results received:', JSON.stringify(roundResults));
      setResults(roundResults);
      setPlayers(roundResults.updatedPlayers);
      setGameState('results');
    });

    socket.on('gameEnd', ({ winner }) => {
      console.debug('Game ended, winner:', winner);
      setWinner(winner);
      setGameState('ended');
    });

    socket.on('chatMessage', ({ senderId, senderName, message }) => {
      console.debug('Chat message received:', { senderId, senderName, message });
      setChatMessages((prev) => [...prev, { senderId, senderName, message }]);
    });

    console.debug('Initial join room:', urlRoomId, 'with creatorId:', creatorId);
    socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    setHasJoined(true);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect');
      socket.off('reconnect_error');
      socket.off('roomJoined');
      socket.off('roomNotFound');
      socket.off('playerUpdate');
      socket.off('newRound');
      socket.off('submissionsReceived');
      socket.off('votingStart');
      socket.off('roundResults');
      socket.off('gameEnd');
      socket.off('chatMessage');
    };
  }, [urlRoomId, router, creatorId]);

  useEffect(() => {
    if (gameState === 'voting' && hasVoted) {
      const timeout = setTimeout(() => {
        if (!results && roomId) {
          console.debug('No results received, retrying...');
          socket.emit('requestResults', roomId);
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [gameState, hasVoted, results, roomId]);

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const startGame = useCallback(
    debounce(() => {
      if (roomId && isCreator && !isStarting) {
        setIsStarting(true);
        console.debug('Starting game for room:', roomId, 'with players:', players.length);
        socket.emit('startGame', roomId);
        setTimeout(() => setIsStarting(false), 1000);
      }
    }, 500),
    [roomId, isCreator, players.length, isStarting]
  );

  const submitAcronym = () => {
    if (acronym && roomId) {
      console.debug('Submitting acronym:', acronym);
      socket.emit('submitAcronym', { roomId, acronym });
      setAcronym('');
    }
  };

  const submitVote = (submissionId) => {
    if (!hasVoted && roomId && submissionId !== socket.id) {
      console.debug('Submitting vote for:', submissionId);
      socket.emit('vote', { roomId, submissionId });
      setHasVoted(true);
    } else if (submissionId === socket.id) {
      console.debug('Cannot vote for your own submission');
      alert('You cannot vote for your own submission!');
    }
  };

  const leaveRoom = () => {
    console.debug('Leaving room:', roomId);
    socket.disconnect();
    sessionStorage.clear();
    router.push('/');
  };

  const resetGame = () => {
    if (isCreator && roomId) {
      console.debug('Resetting game for room:', roomId);
      socket.emit('resetGame', roomId);
      setRoundNum(0);
      setGameState('waiting');
      setSubmissions([]);
      setHasVoted(false);
      setResults(null);
      setWinner(null);
    }
  };

  const setName = () => {
    if (playerName.trim() && roomId) {
      socket.emit('setName', { roomId, name: playerName });
      setNameSet(true);
      setPlayerName('');
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && roomId) {
      const senderName = players.find(p => p.id === socket.id)?.name || socket.id;
      socket.emit('sendMessage', { roomId, message: chatInput });
      setChatMessages((prev) => [...prev, { senderId: socket.id, senderName, message: chatInput }]);
      setChatInput('');
    }
  };

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  console.debug('Rendering - gameState:', gameState, 'isCreator:', isCreator, 'isConnected:', isConnected);

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={styles.container}>
        {roomId ? (
          <>
            {!isConnected && <p style={styles.warning}>Reconnecting to server...</p>}
            <h2 style={styles.title}>Room: {roomId}</h2>
            <div style={styles.invite}>
              <input style={styles.input} type="text" value={inviteLink} readOnly />
              <button style={styles.button} onClick={() => navigator.clipboard.writeText(inviteLink)}>
                Copy Link
              </button>
            </div>

            {!nameSet && gameState === 'waiting' && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Set Your Name</h3>
                <input
                  style={styles.input}
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                />
                <button style={styles.button} onClick={setName}>Set Name</button>
              </div>
            )}

            <h3 style={styles.subtitle}>Players ({players.length}):</h3>
            <ul style={styles.playerList}>
              {players.map((player) => (
                <li key={player.id} style={styles.playerItem}>
                  {player.name || (player.isBot ? player.name : player.id)} - Score: {player.score}
                </li>
              ))}
            </ul>

            {gameState === 'waiting' && nameSet && (
              <div style={styles.section}>
                <p>Waiting for players... (Game starts with 4 players, bots added if needed)</p>
                <button style={styles.button} onClick={startGame} disabled={!isCreator || isStarting}>
                  {isStarting ? 'Starting...' : 'Start Game'}
                </button>
                {!isCreator && <p style={styles.note}>(Only the room creator can start the game)</p>}
              </div>
            )}

            {gameState === 'submitting' && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Round {roundNum} - Letters: {letterSet.join(', ')}</h3>
                <input
                  style={styles.input}
                  type="text"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                  placeholder="Enter acronym"
                />
                <button style={styles.button} onClick={submitAcronym}>Submit</button>
              </div>
            )}

            {gameState === 'voting' && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Vote for an Acronym:</h3>
                <ul style={styles.submissionList}>
                  {submissions.map(([playerId, acronym]) => (
                    <li key={playerId} style={styles.submissionItem}>
                      {acronym} -{' '}
                      <button
                        style={styles.voteButton}
                        onClick={() => submitVote(playerId)}
                        disabled={hasVoted}
                      >
                        Vote
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gameState === 'results' && results && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Round {roundNum} Results</h3>
                <ul style={styles.submissionList}>
                  {results.submissions.map(([playerId, acronym]) => {
                    const voteCount = (results.votes || []).filter(([_, votedId]) => votedId === playerId).length || 0;
                    const player = players.find(p => p.id === playerId);
                    return (
                      <li key={playerId} style={styles.submissionItem}>
                        {acronym} by {player?.name || (player?.isBot ? player.name : playerId)} - Votes: {voteCount}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {gameState === 'ended' && winner && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Game Over!</h3>
                <p>Winner: {winner.name || winner.id} with {winner.score} points</p>
                {isCreator && (
                  <button style={styles.button} onClick={resetGame}>
                    Reset Game
                  </button>
                )}
              </div>
            )}

            <button style={styles.leaveButton} onClick={leaveRoom}>
              Leave Room
            </button>

            {/* Chat Section */}
            <div style={styles.chatContainer}>
              <h3 style={styles.subtitle}>Chat</h3>
              <ul style={styles.chatList}>
                {chatMessages.map((msg, index) => (
                  <li key={index} style={styles.chatItem}>
                    <strong>{msg.senderName}:</strong> {msg.message}
                  </li>
                ))}
              </ul>
              <div style={styles.chatInputContainer}>
                <input
                  style={styles.input}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={100}
                />
                <button style={styles.button} onClick={sendChatMessage}>
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <p style={styles.loading}>Loading room...</p>
        )}
      </div>
    </>
  );
};

const styles = {
  container: {
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
    minHeight: '100vh',
    fontFamily: "'Roboto', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '480px',
    margin: '0 auto',
    color: '#212121',
  },
  warning: {
    color: '#D32F2F',
    marginBottom: '1rem',
    fontSize: '1rem',
    fontWeight: '500',
  },
  title: {
    fontSize: '1.75rem',
    color: '#1976D6',
    marginBottom: '1.25rem',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: '1.5rem',
    color: '#212121',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  invite: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
    width: '100%',
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #B0BEC5',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#FAFAFA',
    color: '#212121',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    ':focus': {
      borderColor: '#1976D6',
      box CucumberShadow: '0 1px 4px rgba(25, 118, 210, 0.5)',
    },
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#1976D6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '200px',
    margin: '0 auto',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      backgroundColor: '#1565C0',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    },
    ':disabled': {
      backgroundColor: '#B0BEC5',
      boxShadow: 'none',
      cursor: 'not-allowed',
    },
  },
  voteButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    backgroundColor: '#1976D6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      backgroundColor: '#1565C0',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    },
    ':disabled': {
      backgroundColor: '#B0BEC5',
      boxShadow: 'none',
      cursor: 'not-allowed',
    },
  },
  leaveButton: {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '200px',
    margin: '2rem auto 0',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    ':hover': {
      backgroundColor: '#C62828',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    },
  },
  playerList: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '1.5rem',
    width: '100%',
  },
  playerItem: {
    padding: '0.75rem',
    backgroundColor: '#FFFFFF',
    marginBottom: '0.75rem',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    textAlign: 'center',
    color: '#212121',
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    },
  },
  submissionList: {
    listStyle: 'none',
    padding: 0,
    width: '100%',
  },
  submissionItem: {
    padding: '0.75rem',
    backgroundColor: '#FFFFFF',
    marginBottom: '0.75rem',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '320px',
    marginLeft: 'auto',
    marginRight: 'auto',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    color: '#212121',
    transition: 'box-shadow 0.2s ease',
    ':hover': {
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
    },
  },
  section: {
    marginBottom: '1.5rem',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  note: {
    color: '#757575',
    fontSize: '0.9rem',
    marginTop: '0.75rem',
  },
  loading: {
    fontSize: '1.25rem',
    textAlign: 'center',
    marginTop: '20vh',
    color: '#212121',
  },
  chatContainer: {
    marginTop: '2rem',
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  chatList: {
    listStyle: 'none',
    padding: 0,
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '1rem',
    width: '100%',
  },
  chatItem: {
    padding: '0.5rem',
    backgroundColor: '#FAFAFA',
    marginBottom: '0.5rem',
    borderRadius: '4px',
    textAlign: 'left',
    color: '#212121',
    wordBreak: 'break-word',
  },
  chatInputContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    width: '100%',
  },
};

export default GameRoom;