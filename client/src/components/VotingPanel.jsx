import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function VotingPanel({ submissions, roomId }) {
  const [selected, setSelected] = useState(null)
  const socket = useSocket()
  const myId = socket?.id

  const handleVote = () => {
    if (selected && socket) {
      socket.emit('vote', { roomId, submissionId: selected })
    }
  }

  return (
    <div className="voting-panel">
      <h4>Vote for your favorite:</h4>
      {submissions.map(([playerId, acronym]) => (
        playerId !== myId && (
          <div key={playerId} className="submission">
            <input
              type="radio"
              name="vote"
              value={playerId}
              onChange={() => setSelected(playerId)}
              disabled={playerId === myId}
            />
            <span>{acronym}</span>
          </div>
        )
      ))}
      <button onClick={handleVote} disabled={!selected}>
        Cast Vote
      </button>
    </div>
  )
}