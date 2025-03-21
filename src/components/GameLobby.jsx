import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function GameLobby({ onGameStart }) {
  const [roomName, setRoomName] = useState('')
  const socket = useSocket()

  const createRoom = () => {
    if (socket && roomName) {
      socket.emit('createRoom', roomName)
      socket.on('roomCreated', (roomId) => {
        onGameStart(roomId)
      })
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