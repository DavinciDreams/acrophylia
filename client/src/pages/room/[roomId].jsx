import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

const GameRoom = () => {
  const router = useRouter();
  const { roomId: urlRoomId } = router.query;
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
  const [isCreator, setIsCreator] = useState(() => sessionStorage.getItem('isCreator') === 'true');

  useEffect(() => {
    if (!urlRoomId) return;

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('connect_error', (err) => console.log('Socket connect error:', err.message));

    socket.on('roomCreated', (newRoomId) => {
      console.log('Room created, I am creator, roomId:', newRoomId);
      setRoomId(newRoomId);
      setIsCreator(true);
      sessionStorage.setItem('isCreator', 'true');
      router.push(`/room/${newRoomId}`);
    });

    socket.on('roomJoined', ({ roomId, isCreator: serverIsCreator }) => {
      console.log('Room joined, roomId:', roomId, 'serverIsCreator:', serverIsCreator);
      setRoomId(roomId);
      if (!isCreator) setIsCreator(serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      console.log('Room not found for roomId:', urlRoomId);
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', (updatedPlayers) => {
      console.log('Players updated:', updatedPlayers);
      setPlayers(updatedPlayers);
    });

    socket.on('newRound', ({ roundNum, letterSet }) => {
      console.log('New round started:', roundNum, letterSet);
      setRoundNum(roundNum);
      setLetterSet(letterSet);
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
      setGameState('results');
    });

    socket.on('gameEnd', ({ winner }) => {
      console.log('Game ended, winner:', winner);
      setWinner(winner);
      setGameState('ended');
    });

    console.log('Joining room:', urlRoomId);
    socket.emit('joinRoom', urlRoomId);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomNotFound');
      socket.off('playerUpdate');
      socket.off('newRound');
      socket.off('submissionsReceived');
      socket.off('votingStart');
      socket.off('roundResults');
      socket.off('gameEnd');
    };
  }, [urlRoomId, router]);

  const submitAcronym = () => {
    if (acronym && roomId) {
      console.log('Submitting acronym:', acronym);
      socket.emit('submitAcronym', { roomId, acronym });
      setAcronym('');
    }
  };

  const submitVote = (submissionId) => {
    if (!hasVoted && roomId) {
      console.log('Submitting vote for:', submissionId);
      socket.emit('vote', { roomId, submissionId });
      setHasVoted(true);
    }
  };

  const startGame = () => {
    if (roomId && isCreator) {
      console.log('Starting game for room:', roomId, 'with players:', players.length);
      socket.emit('startGame', roomId);
    }
  };

  const inviteLink = roomId ? `${window.location.origin}/room/${roomId}` : '';

  console.log('Rendering - gameState:', gameState, 'isCreator:', isCreator);

  return (
    <div>
      {roomId ? (
        <>
          <h2>Room: {roomId}</h2>
          <p>Invite others: <input type="text" value={inviteLink} readOnly /> <button onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</button></p>
          <h3>Players ({players.length}):</h3>
          <ul>
            {players.map((player) => (
              <li key={player.id}>{player.isBot ? `${player.name} (Bot)` : player.id} - Score: {player.score}</li>
            ))}
          </ul>

          {gameState === 'waiting' && (
            <div>
              <p>Waiting for players to join... (Game starts with 4 players, bots added if needed)</p>
              <button onClick={startGame} disabled={!isCreator}>Start Game</button>
              {!isCreator && <p>(Only the room creator can start the game)</p>}
            </div>
          )}

          {gameState === 'submitting' && (
            <>
              <h3>Round {roundNum} - Letters: {letterSet.join(', ')}</h3>
              <input
                type="text"
                value={acronym}
                onChange={(e) => setAcronym(e.target.value.toUpperCase())}
                placeholder="Enter acronym"
              />
              <button onClick={submitAcronym}>Submit</button>
            </>
          )}

          {gameState === 'voting' && (
            <>
              <h3>Vote for an Acronym:</h3>
              <ul>
                {submissions.map(([playerId, acronym]) => (
                  <li key={playerId}>
                    {acronym} - <button onClick={() => submitVote(playerId)} disabled={hasVoted}>Vote</button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {gameState === 'results' && results && (
            <>
              <h3>Round {roundNum} Results</h3>
              <ul>
                {results.submissions.map(([playerId, acronym]) => (
                  <li key={playerId}>
                    {acronym} - Votes: {results.votes.filter(([_, votedId]) => votedId === playerId).length}
                    {results.winnerId === playerId && ' (Winner)'}
                  </li>
                ))}
              </ul>
            </>
          )}

          {gameState === 'ended' && winner && (
            <>
              <h3>Game Over!</h3>
              <p>Winner: {winner.id} with {winner.score} points</p>
            </>
          )}
        </>
      ) : (
        <p>Loading room...</p>
      )}
    </div>
  );
};

export default GameRoom;