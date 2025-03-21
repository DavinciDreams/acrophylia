import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function SubmissionForm({ letters, roomId }) {
  const [acronym, setAcronym] = useState('')
  const socket = useSocket()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (socket && acronym) {
      socket.emit('submitAcronym', { roomId, acronym })
      setAcronym('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="submission-form">
      <h4>Letters: {letters.join('')}</h4>
      <input
        value={acronym}
        onChange={(e) => setAcronym(e.target.value)}
        placeholder="Enter your acronym"
        maxLength={50}
      />
      <button type="submit">Submit</button>
    </form>
  )
}