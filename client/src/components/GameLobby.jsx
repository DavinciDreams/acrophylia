import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function GameLobby({ onGameStart }) {
  const [roomName, setRoomName] = useState('')
  const socket = useSocket()

  const createRoom = () => {
    console.log('Create Room clicked, socket:', socket ? 'connected' : 'not connected')
    if (socket && roomName) {
      console.log('Emitting createRoom with name:', roomName)
      socket.emit('createRoom', roomName)
      socket.on('roomCreated', (roomId) => {
        console.log('Received roomCreated with roomId:', roomId)
        onGameStart(roomId)
      })
    } else {
      console.log('Cannot create room - socket:', !!socket, 'roomName:', roomName)
    }
  }

  return (
    <div className="lobby">
      <h1>Acrophobia</h1>
      <input
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Enter room name"
      />
      <button onClick={createRoom}>Create Game</button>
    </div>
  )
}