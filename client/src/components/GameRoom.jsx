import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import config from '../config';

const socket = io(config.socketUrl, {
  withCredentials: true,
  transports: ['polling'],
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
  const [gameType, setGameType] = useState(null);
  const [content, setContent] = useState(null); // Will hold letters, date, or movie title
  const [category, setCategory] = useState('');
  const [submission, setSubmission] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [gameState, setGameState] = useState('waiting');
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState(null);
  const [winners, setWinners] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCreator = sessionStorage.getItem('isCreator') === 'true';
      setIsCreator(storedCreator);
      console.log('Initial isCreator from sessionStorage:', storedCreator);
    }

    if (!urlRoomId || hasJoined) return;

    socket.on('connect', () => {
      console.log('Socket connected, ID:', socket.id);
      setConnectionError(null);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
      setConnectionError('Failed to connect to server. Retrying...');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
      setConnectionError('Disconnected from server. Reconnecting...');
    });

    socket.on('reconnect', (attempt) => {
      console.log('Socket reconnected after', attempt, 'attempts');
      setConnectionError(null);
      socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    });

    socket.on('reconnect_error', (err) => {
      console.error('Socket reconnect error:', err.message);
      setConnectionError('Reconnection failed. Please refresh the page.');
    });

    socket.on('roomJoined', ({ roomId, isCreator: serverIsCreator }) => {
      console.log('Room joined, roomId:', roomId, 'serverIsCreator:', serverIsCreator, 'socket.id:', socket.id);
      setRoomId(roomId);
      if (!isCreator && serverIsCreator) setIsCreator(serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      console.warn('Room not found for roomId:', urlRoomId);
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', (updatedPlayers) => {
      console.log('Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socket.on('newRound', ({ roundNum, gameType, content, category, timeLeft }) => {
      console.log('New round started:', roundNum, gameType, content);
      setRoundNum(roundNum);
      setGameType(gameType);
      setContent(content);
      setCategory(category || '');
      setGameState('submitting');
      setSubmissions([]);
      setHasVoted(false);
      setResults(null);
    });

    socket.on('submissionsReceived', (submissionList) => {
      console.log('Submissions received:', submissionList);
      setSubmissions(submissionList);
      setGameState('voting');
    });

    socket.on('votingStart', () => {
      console.log('Voting started');
      setGameState('voting');
    });

    socket.on('roundResults', (roundResults) => {
      console.log('Round results:', roundResults);
      setResults(roundResults);
      setPlayers(roundResults.updatedPlayers); // Update players with scores
      setGameState('results');
    });

    socket.on('gameEnd', ({ winners }) => {
      console.log('Game ended, winners:', winners);
      setWinners(winners);
      setGameState('ended');
    });

    socket.on('gameReset', () => {
      console.log('Game reset received');
      setRoundNum(0);
      setGameState('waiting');
      setSubmissions([]);
      setHasVoted(false);
      setResults(null);
      setWinners(null);
    });

    console.log('Joining room:', urlRoomId, 'with creatorId:', creatorId);
    socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    setHasJoined(true);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
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
      socket.off('gameReset');
    };
  }, [urlRoomId, router, creatorId]);

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
        console.log('Starting game for room:', roomId, 'with players:', players.length);
        socket.emit('startGame', roomId);
        setTimeout(() => setIsStarting(false), 1000);
      }
    }, 500),
    [roomId, isCreator, players.length, isStarting]
  );

  const submitContent = () => {
    if (submission && roomId) {
      console.log(`Submitting ${gameType}:`, submission);
      socket.emit('submitContent', { roomId, submission });
      setSubmission('');
    }
  };

  const submitVote = (submissionId) => {
    if (!hasVoted && roomId) {
      console.log('Submitting vote for:', submissionId);
      socket.emit('vote', { roomId, submissionId });
      setHasVoted(true);
    }
  };

  const leaveRoom = () => {
    console.log('Leaving room:', roomId);
    socket.disconnect();
    sessionStorage.clear();
    router.push('/');
  };

  const resetGame = () => {
    if (isCreator && roomId) {
      console.log('Resetting game for room:', roomId);
      socket.emit('resetGame', roomId);
    }
  };

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  console.log('Rendering - gameState:', gameState, 'isCreator:', isCreator);

  return (
    <div style={styles.container}>
      {connectionError && <p style={styles.error}>{connectionError}</p>}
      {roomId ? (
        <>
          <h2 style={styles.title}>Room: {roomId}</h2>
          <div style={styles.invite}>
            <input style={styles.input} type="text" value={inviteLink} readOnly />
            <button style={styles.button} onClick={() => navigator.clipboard.writeText(inviteLink)}>
              Copy Link
            </button>
          </div>
          <h3 style={styles.subtitle}>Players ({players.length}):</h3>
          <ul style={styles.playerList}>
            {players.map((player) => (
              <li key={player.id} style={styles.playerItem}>
                {player.isBot ? `${player.name} (Bot)` : player.id} - Score: {player.score}
              </li>
            ))}
          </ul>

          {gameState === 'waiting' && (
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
              <h3 style={styles.subtitle}>Round {roundNum}</h3>
              <div style={styles.gameTypeIndicator}>
                Game Type: <span data-testid="current-game-type">
                  {gameType === 'acronym' ? 'Acronyms' : 
                   gameType === 'date' ? 'Historical Dates' : 
                   gameType === 'movie' ? 'Movie Plots' : 'Unknown'}
                </span>
              </div>
              
              {gameType === 'acronym' && (
                <div style={styles.contentDisplay}>
                  <p>Create an acronym using these letters:</p>
                  <div style={styles.letters}>{Array.isArray(content) ? content.join(' ') : ''}</div>
                  <p>Category: {category}</p>
                </div>
              )}
              
              {gameType === 'date' && (
                <div style={styles.contentDisplay}>
                  <p>What happened on this date?</p>
                  <div style={styles.date}>{content}</div>
                  <p>Create a fictional historical event</p>
                </div>
              )}
              
              {gameType === 'movie' && (
                <div style={styles.contentDisplay}>
                  <p>Write a plot for this movie:</p>
                  <div style={styles.movieTitle}>{content}</div>
                  <p>Create a brief, creative plot summary</p>
                </div>
              )}
              
              {gameType === 'acronym' ? (
                <input
                  style={styles.input}
                  type="text"
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value.toUpperCase())}
                  placeholder={`Enter a phrase using the letters ${Array.isArray(content) ? content.join('') : ''}`}
                />
              ) : (
                <textarea
                  style={styles.textarea}
                  value={submission}
                  onChange={(e) => setSubmission(e.target.value)}
                  placeholder={gameType === 'date' ? 
                    'Enter a fictional historical event for this date' : 
                    'Enter a plot summary for this movie'}
                  rows={4}
                />
              )}
              
              <button style={styles.button} onClick={submitContent}>Submit</button>
            </div>
          )}

          {gameState === 'voting' && (
            <div style={styles.section}>
              <h3 style={styles.subtitle}>Vote for an answer:</h3>
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
                {results.submissions.map(([playerId, acronym]) => (
                  <li key={playerId} style={styles.submissionItem}>
                    {acronym} - Votes: {results.votes.filter(([_, votedId]) => votedId === playerId).length}
                    {results.winnerIds.includes(playerId) && ' (Winner)'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gameState === 'ended' && winners && (
            <div style={styles.section}>
              <h3 style={styles.subtitle}>Game Over!</h3>
              <p>
                Winner{winners.length > 1 ? 's' : ''}: {winners.map(w => `${w.id} (${w.score} points)`).join(', ')}
              </p>
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
        </>
      ) : (
        <p style={styles.loading}>Loading room...</p>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '2rem', backgroundColor: '#f0f4f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  error: { color: '#dc3545', textAlign: 'center', marginBottom: '1rem' },
  title: { fontSize: '2rem', color: '#333', marginBottom: '1rem' },
  gameTypeIndicator: { backgroundColor: '#e0e8f0', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold' },
  contentDisplay: { backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' },
  letters: { fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '0.5rem', margin: '1rem 0' },
  date: { fontSize: '1.5rem', fontWeight: 'bold', margin: '1rem 0' },
  movieTitle: { fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', margin: '1rem 0' },
  textarea: { width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ced4da', minHeight: '100px' },
  subtitle: { fontSize: '1.5rem', color: '#555', marginBottom: '1rem' },
  invite: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
  input: { padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '5px', flexGrow: 1 },
  button: { padding: '0.75rem 1.5rem', fontSize: '1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', transition: 'background-color 0.3s' },
  voteButton: { padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  leaveButton: { padding: '0.75rem 1.5rem', fontSize: '1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '2rem' },
  playerList: { listStyle: 'none', padding: 0, marginBottom: '2rem' },
  playerItem: { padding: '0.5rem', backgroundColor: '#fff', marginBottom: '0.5rem', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  submissionList: { listStyle: 'none', padding: 0 },
  submissionItem: { padding: '0.5rem', backgroundColor: '#fff', marginBottom: '0.5rem', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  section: { marginBottom: '2rem' },
  note: { color: '#777', fontSize: '0.9rem' },
  loading: { fontSize: '1.2rem', textAlign: 'center', marginTop: '20vh' },
};

export default GameRoom;