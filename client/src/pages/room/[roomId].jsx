import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000, // Increase timeout for slow server wake-up
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCreator = sessionStorage.getItem('isCreator') === 'true';
      setIsCreator(storedCreator);
      console.debug('Initial isCreator from sessionStorage:', storedCreator);
    }

    if (!urlRoomId || hasJoined) return;

    socket.on('connect', () => {
      console.debug('Socket connected, ID:', socket.id);
      if (urlRoomId && !hasJoined) {
        console.debug('Rejoining room:', urlRoomId, 'with creatorId:', creatorId);
        socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
      }
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
      setPlayers(prevPlayers => {
        console.debug('Updating players with scores:', roundResults.updatedPlayers);
        return roundResults.updatedPlayers;
      });
      setGameState('results');
    });

    socket.on('gameEnd', ({ winner }) => {
      console.debug('Game ended, winner:', winner);
      setWinner(winner);
      setGameState('ended');
    });

    console.debug('Joining room:', urlRoomId, 'with creatorId:', creatorId);
    socket.emit('joinRoom', { roomId: urlRoomId, creatorId });
    setHasJoined(true);

    return () => {
      socket.off('connect');
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
    if (!hasVoted && roomId) {
      console.debug('Submitting vote for:', submissionId);
      socket.emit('vote', { roomId, submissionId });
      setHasVoted(true);
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

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  console.debug('Rendering - gameState:', gameState, 'isCreator:', isCreator);

  return (
    <div style={styles.container}>
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
                  return (
                    <li key={playerId} style={styles.submissionItem}>
                      {acronym} - Votes: {voteCount}
                      {results.winnerId === playerId && ' (Winner)'}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {gameState === 'ended' && winner && (
            <div style={styles.section}>
              <h3 style={styles.subtitle}>Game Over!</h3>
              <p>Winner: {winner.id} with {winner.score} points</p>
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
  title: { fontSize: '2rem', color: '#333', marginBottom: '1rem' },
  subtitle: { fontSize: '1.5rem', color: '#555', marginBottom: '1rem' },
  invite: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
  input: { padding: '0.5rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '5px', flexGrow: 1 },
  button: { padding: '0.75rem 1.5rem', fontSize: '1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
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