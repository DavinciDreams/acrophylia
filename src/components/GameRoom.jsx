import { useState, useEffect } from 'react'
import { useSocket } from '../lib/socket'
import PlayerList from './PlayerList'
import SubmissionForm from './SubmissionForm'
import VotingPanel from './VotingPanel'
import { generateLetters } from '../utils/gameLogic'

export default function GameRoom({ roomId }) {
  const socket = useSocket()
  const [players, setPlayers] = useState([])
  const [round, setRound] = useState(1)
  const [letters, setLetters] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [phase, setPhase] = useState('submission')
  const [results, setResults] = useState(null)
  const [winner, setWinner] = useState(null)

  useEffect(() => {
    if (socket) {
      socket.emit('joinRoom', roomId)
      
      socket.on('playerUpdate', setPlayers)
      socket.on('newRound', ({ roundNum, letterSet }) => {
        setRound(roundNum)
        setLetters(letterSet)
        setPhase('submission')
        setResults(null)
      })
      socket.on('submissionsReceived', setSubmissions)
      socket.on('votingStart', () => setPhase('voting'))
      socket.on('roundResults', (roundResults) => {
        setResults(roundResults)
        setPhase('roundEnd')
        setPlayers(roundResults.updatedPlayers)
      })
      socket.on('gameEnd', ({ winner }) => {
        setWinner(winner)
        setPhase('gameEnd')
      })
    }
  }, [socket, roomId])

  return (
    <div className="game-room">
      <h2>Round {round} - {letters.join('')}</h2>
      <PlayerList players={players} />
      
      {phase === 'submission' && (
        <SubmissionForm letters={letters} roomId={roomId} />
      )}
      {phase === 'voting' && (
        <VotingPanel submissions={submissions} roomId={roomId} />
      )}
      {phase === 'roundEnd' && results && (
        <div>
          <h3>Round Results</h3>
          {results.submissions.map(([id, acronym]) => (
            <p key={id}>
              {acronym} - {results.votes.filter(([_, voteId]) => voteId === id).length} votes
              {results.winnerId === id && ' (Winner)'}
            </p>
          ))}
        </div>
      )}
      {phase === 'gameEnd' && winner && (
        <div>
          <h3>Game Over!</h3>
          <p>Winner: {winner.id} with {winner.score} points!</p>
        </div>
      )}
    </div>
  )
}