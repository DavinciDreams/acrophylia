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
    socket.on('connect', () => console.log('Socket connected on index, ID:', socket.id));
    socket.on('connect_error', (err) => console.log('Socket connect error on index:', err.message));
    return () => {
      socket.off('connect');
      socket.off('connect_error');
    };
  }, []);

  const createRoom = () => {
    console.log('Creating room with socket.id:', socket.id);
    socket.emit('createRoom', 'one');
    socket.once('roomCreated', (roomId) => {
      console.log('Room created received, roomId:', roomId);
      sessionStorage.setItem('isCreator', 'true');
      sessionStorage.setItem('creatorSocketId', socket.id); // Store creator's socket ID
      router.push(`/room/${roomId}?creatorId=${socket.id}`);
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