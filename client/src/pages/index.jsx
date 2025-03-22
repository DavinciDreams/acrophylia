import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

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
    console.debug('Creating room with socket.id:', socket.id);
    socket.emit('createRoom', 'one');
    socket.once('roomCreated', (roomId) => {
      console.debug('Room created received, roomId:', roomId);
      sessionStorage.setItem('isCreator', 'true');
      sessionStorage.setItem('creatorSocketId', socket.id);
      router.push(`/room/${roomId}?creatorId=${socket.id}`);
    });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Acrophylia</h1>
      <button style={styles.button} onClick={createRoom}>
        Create Room
      </button>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: '3rem',
    color: '#333',
    marginBottom: '2rem',
  },
  button: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
};

export default Home;