import React from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';

const socket = io('https://acrophylia.onrender.com'); // Replace with your Render URL

const Home = () => {
  const router = useRouter();

  const createRoom = () => {
    socket.emit('createRoom', 'one');
    socket.on('roomCreated', (roomId) => {
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