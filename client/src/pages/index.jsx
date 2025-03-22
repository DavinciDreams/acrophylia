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
    socket.on('connect', () => console.log('Socket connected on index'));
    socket.on('connect_error', (err) => console.log('Socket connect error on index:', err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const createRoom = () => {
    console.log('Creating room');
    socket.emit('createRoom', 'one');
    socket.once('roomCreated', (roomId) => {
      console.log('Room created received, roomId:', roomId);
      sessionStorage.setItem('isCreator', 'true');
      router.push(`/room/${roomId}`);
    });
  };

  return (
    <div>
      <h1>Acrophylia</h1>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
};

export default Home;