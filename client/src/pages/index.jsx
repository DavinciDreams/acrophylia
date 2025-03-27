import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Head from 'next/head';

const socket = io('https://acrophylia.onrender.com', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

const Home = () => {
  const router = useRouter();

  useEffect(() => {
    socket.on('connect', () => console.debug('Socket connected on index, ID:', socket.id));
    socket.on('connect_error', (err) => console.error('Socket connect error on index:', err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const createRoom = () => {
    socket.emit('createRoom', 'Neobrutalist Room');
    
    socket.once('roomCreated', (roomId) => {
      console.debug('Room created received, roomId:', roomId);
      sessionStorage.setItem('isCreator', 'true');
      sessionStorage.setItem('creatorSocketId', socket.id);
      router.push(`/room/${roomId}?creatorId=${socket.id}`);
    });
  };

  return (
    <>
      <Head>
        <title>Acrophylia | Word Game</title>
        <meta name="description" content="A fun word game where players create phrases from random letters" />
      </Head>
      
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.glitch}>
            <h1 style={styles.title}>ACROPHYLIA</h1>
            <div style={styles.subtitle}>THE ULTIMATE WORD GAME</div>
          </div>
          
          <div style={styles.inputContainer}>
            <button 
              style={styles.button} 
              onClick={createRoom}
            >
              CREATE ROOM
            </button>
          </div>
          
          <div style={styles.instructions}>
            <p>Create a room and invite friends to play!</p>
            <p>Each round, players create phrases from random letters.</p>
            <p>Vote for your favorites and score points!</p>
          </div>
        </div>
        
        <footer style={styles.footer}>
          <div style={styles.footerText}>NEOBRUTALIST EDITION © 2025</div>
        </footer>
      </div>
    </>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--secondary)',
    padding: '20px',
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'var(--background)',
    border: 'var(--border)',
    boxShadow: 'var(--shadow)',
    padding: '40px 30px',
    textAlign: 'center',
    position: 'relative',
    zIndex: 1,
  },
  glitch: {
    position: 'relative',
    marginBottom: '30px',
  },
  title: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '4.5rem',
    fontWeight: 'bold',
    color: 'var(--text)',
    textTransform: 'uppercase',
    margin: '0 0 5px 0',
    position: 'relative',
    textShadow: `2px 0 0 var(--primary), -2px 0 0 var(--accent)`,
    letterSpacing: '-2px',
  },
  subtitle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: 'var(--primary)',
    color: 'white',
    padding: '5px 10px',
    display: 'inline-block',
    transform: 'rotate(-1deg)',
    border: '2px solid var(--text)',
  },
  inputContainer: {
    marginBottom: '30px',
  },
  input: {
    width: '100%',
    padding: '15px',
    marginBottom: '15px',
    fontFamily: '"Space Mono", monospace',
    fontSize: '1rem',
    border: '3px solid var(--text)',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '15px',
    backgroundColor: 'var(--accent)',
    color: 'var(--text)',
    border: '3px solid var(--text)',
    boxShadow: '5px 5px 0px var(--text)',
    cursor: 'pointer',
    fontFamily: '"Space Mono", monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    transition: 'transform 0.1s, box-shadow 0.1s',
    marginTop: '10px',
  },
  instructions: {
    marginTop: '30px',
    padding: '20px',
    backgroundColor: '#f0f0f0',
    border: '3px solid var(--text)',
    textAlign: 'left',
  },
  footer: {
    marginTop: '40px',
    width: '100%',
    textAlign: 'center',
  },
  footerText: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'var(--text)',
    backgroundColor: 'var(--background)',
    padding: '5px 15px',
    border: '2px solid var(--text)',
    display: 'inline-block',
  }
};

export default Home;