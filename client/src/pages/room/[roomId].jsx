import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Head from 'next/head';
import PlayerList from '../../components/PlayerList';

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
  const [roomName, setRoomName] = useState('');
  const [roomNameSet, setRoomNameSet] = useState(false);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false); // New state for edit mode
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
      setRoomName(roomName);
      setRoomNameSet(!!roomName && roomName !== `Room ${roomId}`);
      sessionStorage.setItem('isCreator', serverIsCreator);
    });

    socket.on('roomNotFound', () => {
      alert('Room not found!');
      router.push('/');
    });

    socket.on('playerUpdate', ({ players, roomName }) => {
      setPlayers(players);
      setRoomName(roomName);
      setRoomNameSet(!!roomName && roomName !== `Room ${roomId}`);
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

  const setRoomNameHandler = () => {
    if (roomName.trim() && roomId && isCreator && !roomNameSet) {
      socket.emit('setRoomName', { roomId, roomName });
      setRoomNameSet(true);
      setIsEditingRoomName(false); // Exit edit mode on save
    }
  };

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
      setRoomNameSet(false);
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
        <title>{`Acrophylia - Room ${roomId || ''}`}</title>
        {/* Move this to _document.js as per Next.js recommendation */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @media (max-width: 768px) {
            .container { padding: 1rem; }
            .title { font-size: 1.75rem; }
            .subtitle { font-size: 1.25rem; }
            .input { padding: 0.5rem; }
            .button { padding: 0.5rem 1rem; }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
          button:hover {
            transform: translate(-2px, -2px);
            box-shadow: 6px 6px 0px var(--text);
          }
          button:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px var(--text);
          }
        `}</style>
      </Head>
      <div className="game-room-container">
        {roomId ? (
          <>
            <header className="header">
              <div className="room-title-container">
                {isEditingRoomName && isCreator && !roomNameSet && gameState === 'waiting' ? (
                  <div className="room-name-edit">
                    <input
                      className="input"
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="Enter room name"
                      maxLength={20}
                      onKeyPress={(e) => e.key === 'Enter' && setRoomNameHandler()}
                    />
                    <button className="btn btn-sm btn-blue" onClick={setRoomNameHandler}>
                      Save
                    </button>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => setIsEditingRoomName(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <h2 className="title">
                    {roomName || `Room ${roomId}`}
                    {isCreator && !roomNameSet && gameState === 'waiting' && (
                      <button
                        className="btn btn-xs btn-accent"
                        onClick={() => setIsEditingRoomName(true)}
                        aria-label="Edit Room Name"
                      >
                        ✏️
                      </button>
                    )}
                  </h2>
                )}
              </div>
              <div className="status-container">
                {!isConnected && (
                  <div className="reconnecting-badge">
                    <span className="reconnecting-text">RECONNECTING</span>
                    <span className="reconnecting-dots">...</span>
                  </div>
                )}
                <div
                  className={`game-status-badge ${gameState === 'waiting' ? 'bg-accent' : 
                    gameState === 'submitting' ? 'bg-blue' : 
                    gameState === 'voting' ? 'bg-primary' : 
                    gameState === 'results' ? 'bg-blue' : 'bg-background'}`}
                >
                  <span className="game-status-text">
                    {gameState.toUpperCase()}
                  </span>
                </div>
              </div>
            </header>

            {!gameStarted && (
              <div className="invite-container">
                <div className="invite-header">
                  <h3 className="invite-title">INVITE FRIENDS</h3>
                </div>
                <div className="invite-content">
                  <input className="invite-input" type="text" value={inviteLink} readOnly />
                  <button
                    className="btn btn-md btn-blue"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      alert('Link copied to clipboard!');
                    }}
                  >
                    COPY LINK
                  </button>
                </div>
                <div className="info-box">
                  Share this link with friends to invite them to your game room!
                </div>
              </div>
            )}

            {!nameSet && gameState === 'waiting' && (
              <div className="game-section">
                <div className="name-set-form">
                  <input
                    className="main-input"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    maxLength={20}
                    onKeyPress={(e) => e.key === 'Enter' && playerName.trim() && setName()}
                  />
                  <button
                    className="btn btn-md btn-primary"
                    onClick={setName}
                    disabled={!playerName.trim()}
                  >
                    Set Name
                  </button>
                </div>
                <div className="info-box">
                  Enter a name to join the game. You'll be able to play once the room creator starts the game.
                </div>
              </div>
            )}

            {gameState === 'waiting' && nameSet && (
              <div className="game-section">
                <div className="waiting-header">
                  <h3 className="waiting-title">WAITING FOR PLAYERS</h3>
                </div>
                <div className="waiting-info">
                  <div className="info-box">
                    Game starts with 4 players. Bots will be added if needed.
                  </div>
                  <div className="player-count">
                    <span className="player-count-label">PLAYERS:</span>
                    <span className="player-count-value">{players.length}/4</span>
                  </div>
                </div>
                {isCreator ? (
                  <button
                    className={`btn btn-lg btn-primary ${players.length >= 2 && !isStarting ? 'pulse-animation' : ''} ${isStarting ? 'opacity-70' : ''}`}
                    onClick={startGame}
                    disabled={isStarting}
                  >
                    {isStarting ? 'STARTING...' : 'START GAME'}
                  </button>
                ) : (
                  <div className="creator-note">
                    <div className="creator-icon">👑</div>
                    <div className="creator-text">
                      Waiting for the room creator to start the game...
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState === 'submitting' && (
              <div className="game-section">
                <div className="round-header">
                  ROUND {roundNum} OF 5
                </div>
                <div className="game-info">
                  <div className="category-container">
                    <span className="category-label">CATEGORY:</span>
                    <span className="category-value pill">{category}</span>
                  </div>
                  <div className="letters-container">
                    <span className="letters-label">LETTERS:</span>
                    <div className="letter-boxes">
                      {letterSet.map((letter, index) => (
                        <span key={index} className="letter-box">{letter}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`timer-container ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
                  <span className="timer-label">TIME LEFT: {timeLeft !== null ? `${timeLeft}s` : 'WAITING...'}</span>
                </div>
                <div className="submission-form">
                  <input
                    className={`main-input ${hasSubmitted ? 'submitted' : ''}`}
                    type="text"
                    value={acronym}
                    onChange={(e) => setAcronym(e.target.value)}
                    placeholder="Enter your acronym"
                    disabled={hasSubmitted || timeLeft === 0}
                    onKeyPress={(e) => e.key === 'Enter' && !hasSubmitted && timeLeft > 0 && submitAcronym()}
                  />
                  <button
                    className={`btn btn-lg btn-primary ${hasSubmitted || timeLeft === 0 ? 'opacity-70' : ''}`}
                    onClick={submitAcronym}
                    disabled={hasSubmitted || timeLeft === 0}
                  >
                    {hasSubmitted ? 'SUBMITTED!' : 'SUBMIT'}
                  </button>
                </div>
                {hasSubmitted && (
                  <div className="info-box">
                    Your submission has been received! Waiting for other players...
                  </div>
                )}
              </div>
            )}

            {gameState === 'voting' && (
              <div className="game-section">
                <div className="round-header">
                  <h3 className="round-title">VOTE FOR AN ACRONYM</h3>
                </div>
                <div className={`timer-container ${timeLeft <= 10 ? 'timer-warning' : ''}`}>
                  <span className="timer-label">TIME LEFT:</span>
                  <span className="timer-value">
                    {timeLeft !== null ? `${timeLeft}s` : 'WAITING...'}
                  </span>
                </div>
                <div className="info-box">
                  {hasVoted ? 'You have cast your vote! Waiting for others...' : 'Choose your favorite acronym below:'}
                </div>
                <ul className="voting-list">
                  {submissions.map(([playerId, acronym]) => {
                    const isOwnSubmission = playerId === socket.id;
                    const isDisabled = hasVoted || isOwnSubmission || timeLeft === 0;
                    return (
                      <li
                        key={playerId}
                        className={`voting-item ${isOwnSubmission ? 'own-submission' : ''} ${isDisabled ? 'disabled' : ''}`}
                      >
                        <div className="acronym-display">
                          {acronym || '(No submission)'}
                          {isOwnSubmission && <span className="your-submission-badge">YOUR SUBMISSION</span>}
                        </div>
                        <button
                          className={`btn btn-xs btn-primary ${isDisabled ? 'opacity-70' : ''}`}
                          onClick={() => submitVote(playerId)}
                          disabled={isDisabled}
                        >
                          {hasVoted ? 'VOTED' : 'VOTE'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {gameState === 'results' && results && (
              <div className="game-section">
                <div className="round-header section-header">
                  <h3 className="round-title">ROUND {roundNum} RESULTS</h3>
                </div>
                <div className="results-container">
                  {results.submissions.map(([playerId, acronym]) => {
                    const voteCount = (results.votes || []).filter(([_, votedId]) => votedId === playerId).length || 0;
                    const player = players.find(p => p.id === playerId);
                    const isOwnSubmission = playerId === socket.id;
                    const hasVotes = voteCount > 0;
                    return (
                      <div
                        key={playerId}
                        className={`result-item ${isOwnSubmission ? 'own-result' : ''} ${hasVotes ? 'has-votes' : ''}`}
                      >
                        <div className="result-acronym">
                          {acronym || '(No submission)'}
                        </div>
                        <div className="result-details">
                          <div className="result-player">
                            <span className="result-player-label">PLAYER:</span>
                            <span className="result-player-name">
                              {player?.name || (player?.isBot ? player.name : playerId)}
                              {isOwnSubmission && <span className="your-result-badge">YOU</span>}
                            </span>
                          </div>
                          <div className={`result-votes ${voteCount > 0 ? 'has-votes' : ''}`}
                          >
                            <span className="result-votes-label">VOTES:</span>
                            <span className="result-votes-count">{voteCount}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {gameState === 'ended' && winner && (
              <div className="game-section">
                <div className="game-over-header">
                  <h3 className="game-over-title">GAME OVER!</h3>
                </div>
                <div className="winner-container">
                  <div className="winner-label">WINNER</div>
                  <div className="winner-name">{winner.name || winner.id}</div>
                  <div className="winner-score">
                    <span className="winner-score-label">SCORE</span>
                    <span className="winner-score-value">{winner.score}</span>
                  </div>
                  <div className="trophy-icon">🏆</div>
                </div>
                <div className="game-over-actions">
                  {isCreator ? (
                    <button className="btn btn-md btn-blue btn-wide" onClick={resetGame}>
                      START NEW GAME
                    </button>
                  ) : (
                    <div className="info-box">
                      Waiting for room creator to start a new game...
                    </div>
                  )}
                </div>
              </div>
            )}

            <PlayerList players={players} leaveRoom={leaveRoom} />

            {gameStarted && (
              <div className="chat-container">
                <h3 className="section-header">GAME CHAT</h3>
                <div className="chat-list-wrapper">
                  <ul className="chat-list" ref={chatListRef}>
                    {chatMessages.map((msg, index) => (
                      <li
                        key={index}
                        className={`chat-item ${msg.senderId === socket.id ? 'own-message' : ''}`}
                      >
                        <div className="chat-sender pill">
                          {msg.senderName}
                        </div>
                        <div className="chat-message">{msg.message}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="chat-input-container">
                  <input
                    className="main-input chat-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    maxLength={100}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                  />
                  <button className="btn btn-md btn-primary" onClick={sendChatMessage}>
                    SEND
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="loading-message">Loading room...</p>
        )}
      </div>
    </>
  );
};

// All styles have been migrated to CSS classes in globals.css

export default GameRoom;