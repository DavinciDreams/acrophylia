import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [roomName, setRoomName] = useState(''); // New state for room name
  const [players, setPlayers] = useState([]);
  const [roundNum, setRoundNum] = useState(0);
  const [letterSet, setLetterSet] = useState([]);
  const [category, setCategory] = useState('');
  const [acronym, setAcronym] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
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
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const chatListRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCreator = sessionStorage.getItem('isCreator') === 'true';
      setIsCreator(storedCreator);
    }

    if (!urlRoomId || hasJoined) return;

    socket.on('connect', () => {
      setIsConnected(true);
      if (urlRoomId && !hasJoined) {
        socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('roomJoined', ({ roomId, isCreator: serverIsCreator, roomName }) => {
      setRoomId(roomId);
      setIsCreator(serverIsCreator);
      setRoomName(roomName); // Set room name on join
      sessionStorage.setItem('isCreator', serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', ({ players, roomName }) => {
      setPlayers(players);
      setRoomName(roomName); // Update room name with player updates
      const currentPlayer = players.find(p => p.id === socket.id);
      if (currentPlayer && currentPlayer.name) setNameSet(true);
    });

    socket.on('creatorUpdate', (newCreatorId) => {
      setIsCreator(socket.id === newCreatorId);
      sessionStorage.setItem('isCreator', socket.id === newCreatorId);
    });

    socket.on('gameStarted', () => {
      setGameStarted(true);
    });

    socket.on('newRound', ({ roundNum, letterSet, timeLeft: initialTime, category }) => {
      setRoundNum(roundNum);
      setLetterSet(letterSet);
      setCategory(category);
      setGameState('submitting');
      setSubmissions([]);
      setHasVoted(false);
      setHasSubmitted(false);
      setResults(null);
      setTimeLeft(initialTime);
    });

    socket.on('timeUpdate', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    socket.on('submissionsReceived', (submissionList) => {
      setSubmissions(submissionList);
    });

    socket.on('votingStart', () => {
      setGameState('voting');
    });

    socket.on('roundResults', (roundResults) => {
      setResults(roundResults);
      setPlayers(roundResults.updatedPlayers);
      setGameState('results');
      setTimeLeft(null);
    });

    socket.on('gameEnd', ({ winner }) => {
      setWinner(winner);
      setGameState('ended');
    });

    socket.on('gameReset', () => {
      setRoundNum(0);
      setGameState('waiting');
      setSubmissions([]);
      setHasVoted(false);
      setHasSubmitted(false);
      setResults(null);
      setWinner(null);
      setTimeLeft(null);
      setGameStarted(false);
      setCategory('');
    });

    socket.on('chatMessage', ({ senderId, senderName, message }) => {
      setChatMessages((prev) => [...prev, { senderId, senderName, message }]);
    });

    socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    setHasJoined(true);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('roomJoined');
      socket.off('roomNotFound');
      socket.off('playerUpdate');
      socket.off('creatorUpdate');
      socket.off('gameStarted');
      socket.off('newRound');
      socket.off('timeUpdate');
      socket.off('submissionsReceived');
      socket.off('votingStart');
      socket.off('roundResults');
      socket.off('gameEnd');
      socket.off('gameReset');
      socket.off('chatMessage');
    };
  }, [urlRoomId, router, creatorId]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (gameState === 'voting' && hasVoted) {
      const timeout = setTimeout(() => {
        if (!results && roomId) socket.emit('requestResults', roomId);
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
        socket.emit('startGame', roomId);
        setTimeout(() => setIsStarting(false), 1000);
      }
    }, 500),
    [roomId, isCreator, isStarting]
  );

  const submitAcronym = () => {
    if (acronym && roomId && !hasSubmitted) {
      socket.emit('submitAcronym', { roomId, acronym });
      setHasSubmitted(true);
      setAcronym('');
    }
  };

  const submitVote = (submissionId) => {
    if (!hasVoted && roomId && submissionId !== socket.id) {
      socket.emit('vote', { roomId, submissionId });
      setHasVoted(true);
    } else if (submissionId === socket.id) {
      alert('You cannot vote for your own submission!');
    }
  };

  const leaveRoom = () => {
    if (roomId) {
      socket.emit('leaveRoom', roomId);
      setRoomId(null);
      setRoomName('');
      setPlayers([]);
      setGameState('waiting');
      setGameStarted(false);
      setHasJoined(false);
      sessionStorage.clear();
      router.push('/');
    }
  };

  const resetGame = () => {
    if (isCreator && roomId) {
      socket.emit('resetGame', roomId);
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
      socket.emit('sendMessage', { roomId, message: chatInput });
      setChatInput('');
    }
  };

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
        <style>{`
          @media (max-width: 480px) {
            .container { padding: 0.5rem; }
            .title { font-size: 1.5rem; }
            .subtitle { font-size: 1.25rem; }
            .input { padding: 0.5rem; }
            .button { padding: 0.5rem 1rem; max-width: 150px; }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}</style>
      </Head>
      <div style={styles.container}>
        {roomId ? (
          <>
            <header style={styles.header}>
              <h2 style={styles.title}>{roomName}</h2> {/* Display roomName instead of roomId */}
              <div style={styles.statusContainer}>
                {!isConnected && <span style={styles.warning}>Reconnecting...</span>}
                <span
                  style={{
                    ...styles.gameStatus,
                    color: gameState === 'waiting' ? '#FF9800' : gameState === 'submitting' ? '#4CAF50' : '#1976D6',
                  }}
                >
                  {gameState.charAt(0).toUpperCase() + gameState.slice(1)}
                </span>
              </div>
            </header>

            {!gameStarted && (
              <div style={styles.invite}>
                <input style={styles.input} type="text" value={inviteLink} readOnly />
                <button style={styles.button} onClick={() => navigator.clipboard.writeText(inviteLink)}>
                  Copy Link
                </button>
              </div>
            )}

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
                <li
                  key={player.id}
                  style={{
                    ...styles.playerItem,
                    backgroundColor: player.id === socket.id ? '#E3F2FD' : '#FFFFFF',
                    fontStyle: player.isBot ? 'italic' : 'normal',
                    borderLeft: player.id === (isCreator ? socket.id : players[0]?.id) ? '4px solid #1976D6' : 'none',
                  }}
                >
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
                <h3 style={styles.subtitle}>
                  Round {roundNum} of 5 - Category: <span style={styles.category}>{category}</span> - Letters:{' '}
                  {letterSet.join(', ')}
                </h3>
                <p
                  style={{
                    ...styles.timer,
                    color: timeLeft <= 10 ? '#D32F2F' : '#757575',
                    animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none',
                  }}
                >
                  Time Left: {timeLeft !== null ? `${timeLeft}s` : 'Waiting...'}
                </p>
                <input
                  style={styles.input}
                  type="text"
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  placeholder="Enter acronym"
                  disabled={hasSubmitted || timeLeft === 0}
                />
                <button style={styles.button} onClick={submitAcronym} disabled={hasSubmitted || timeLeft === 0}>
                  Submit
                </button>
              </div>
            )}

            {gameState === 'voting' && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Vote for an Acronym:</h3>
                <p
                  style={{
                    ...styles.timer,
                    color: timeLeft <= 10 ? '#D32F2F' : '#757575',
                    animation: timeLeft <= 10 ? 'pulse 1s infinite' : 'none',
                  }}
                >
                  Time Left: {timeLeft !== null ? `${timeLeft}s` : 'Waiting...'}
                </p>
                <ul style={styles.submissionList}>
                  {submissions.map(([playerId, acronym]) => (
                    <li key={playerId} style={styles.submissionItem}>
                      {acronym || '(No submission)'} -{' '}
                      <button
                        style={styles.voteButton}
                        onClick={() => submitVote(playerId)}
                        disabled={hasVoted || playerId === socket.id || timeLeft === 0}
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
                        {acronym || '(No submission)'} by{' '}
                        {player?.name || (player?.isBot ? player.name : playerId)} - Votes: {voteCount}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {gameState === 'ended' && winner && (
              <div style={styles.section}>
                <h3 style={styles.subtitle}>Game Over!</h3>
                <p>
                  Winner: {winner.name || winner.id} with {winner.score} points
                </p>
                {isCreator && (
                  <button style={styles.button} onClick={resetGame}>
                    New Game
                  </button>
                )}
              </div>
            )}

            <button style={styles.leaveButton} onClick={leaveRoom}>
              Leave Room
            </button>

            {gameStarted && (
              <div style={styles.chatContainer}>
                <h3 style={styles.subtitle}>Chat</h3>
                <ul style={styles.chatList} ref={chatListRef}>
                  {chatMessages.map((msg, index) => (
                    <li key={index} style={styles.chatItem}>
                      <strong style={{ color: msg.senderId === socket.id ? '#1976D6' : '#757575' }}>
                        {msg.senderName}:
                      </strong>{' '}
                      {msg.message}
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
            )}
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
    padding: '1rem',
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
    gap: '1rem',
    fontSize: 'calc(14px + 0.5vw)',
  },
  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: '#F5F5F5',
    padding: '1rem',
    width: '100%',
    maxWidth: '480px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    zIndex: 10,
  },
  statusContainer: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  gameStatus: {
    fontSize: '0.9rem',
    fontWeight: '500',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    backgroundColor: '#E0E0E0',
  },
  warning: {
    color: '#D32F2F',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  title: {
    fontSize: '1.75rem',
    color: '#1976D6',
    margin: 0,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: '1.5rem',
    color: '#212121',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  category: {
    fontWeight: '700',
    color: '#F57C00',
  },
  timer: {
    fontSize: '1rem',
    marginBottom: '0.75rem',
  },
  invite: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
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
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    backgroundColor: '#1976D6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '180px',
    margin: '0.5rem auto',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  voteButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  leaveButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    backgroundColor: '#D32F2F',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '100%',
    maxWidth: '180px',
    margin: '2rem auto 0',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  },
  playerList: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '1rem',
    width: '100%',
  },
  playerItem: {
    padding: '0.75rem',
    marginBottom: '0.75rem',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    textAlign: 'center',
    color: '#212121',
    transition: 'box-shadow 0.2s ease',
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
  },
  section: {
    marginBottom: '1rem',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    borderTop: '1px solid #E0E0E0',
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
    marginTop: '1rem',
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: '1rem',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  },
  chatList: {
    listStyle: 'none',
    padding: '0.5rem',
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '1rem',
    width: '100%',
    backgroundColor: '#FAFAFA',
    borderRadius: '4px',
  },
  chatItem: {
    padding: '0.5rem',
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