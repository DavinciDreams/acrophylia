import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function SubmissionForm({ letters, roomId }) {
  const socket = useSocket()
  const [acronym, setAcronym] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (acronym.length === letters.length) {
      console.log('Submitting acronym:', { roomId, acronym })
      socket.emit('submitAcronym', { roomId, acronym })
      setAcronym('')
    } else {
      console.log('Acronym length mismatch:', acronym.length, 'vs', letters.length)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={acronym}
        onChange={(e) => setAcronym(e.target.value.toUpperCase())}
        placeholder={`Enter ${letters.length} letters`}
        maxLength={letters.length}
      />
      <button type="submit">Submit</button>
    </form>
  )
}