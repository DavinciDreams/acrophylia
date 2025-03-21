import { useState } from 'react'
import GameLobby from '../components/GameLobby'
import GameRoom from '../components/GameRoom'

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false)
  const [roomId, setRoomId] = useState(null)

  return (
    <div className="container">
      {!gameStarted ? (
        <GameLobby onGameStart={(id) => {
          setGameStarted(true)
          setRoomId(id)
        }} />
      ) : (
        <GameRoom roomId={roomId} />
      )}
    </div>
  )
}