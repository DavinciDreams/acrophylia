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
    backgroundColor: '#ffde59',
    padding: '20px',
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: '#ffffff',
    border: '4px solid #000000',
    boxShadow: '8px 8px 0px #000000',
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
    color: '#000000',
    textTransform: 'uppercase',
    margin: '0 0 5px 0',
    position: 'relative',
    textShadow: '2px 0 0 #ff3c00, -2px 0 0 #00c2ff',
    letterSpacing: '-2px',
  },
  subtitle: {
    fontFamily: '"Space Mono", monospace',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: '#ff3c00',
    color: 'white',
    padding: '5px 10px',
    display: 'inline-block',
    transform: 'rotate(-1deg)',
    border: '2px solid #000',
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
    border: '3px solid #000000',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#00c2ff',
    color: '#000000',
    border: '3px solid #000000',
    boxShadow: '5px 5px 0px #000000',
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
    border: '3px solid #000000',
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
    color: '#000000',
    backgroundColor: '#ffffff',
    padding: '5px 15px',
    border: '2px solid #000000',
    display: 'inline-block',
  }
};

export default Home;