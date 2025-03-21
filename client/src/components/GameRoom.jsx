import { useState, useEffect } from 'react'
import { useSocket } from '../lib/socket'
import PlayerList from './PlayerList'
import SubmissionForm from './SubmissionForm'
import VotingPanel from './VotingPanel'

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
    if (!socket) return;

    console.log('Setting up socket listeners for room:', roomId)
    socket.emit('joinRoom', roomId)

    socket.on('playerUpdate', (updatedPlayers) => {
      console.log('Received playerUpdate:', updatedPlayers)
      setPlayers(updatedPlayers)
    })
    socket.on('newRound', ({ roundNum, letterSet }) => {
      console.log('Received newRound:', { roundNum, letterSet })
      setRound(roundNum)
      setLetters(letterSet || [])
      setPhase('submission')
      setResults(null)
    })
    socket.on('submissionsReceived', (subs) => {
      console.log('Received submissionsReceived:', subs)
      setSubmissions(subs)
    })
    socket.on('votingStart', () => {
      console.log('Received votingStart')
      setPhase('voting')
    })
    socket.on('roundResults', (roundResults) => {
      console.log('Received roundResults:', roundResults)
      setResults(roundResults)
      setPhase('roundEnd')
      setPlayers(roundResults.updatedPlayers)
    })
    socket.on('gameEnd', ({ winner }) => {
      console.log('Received gameEnd:', winner)
      setWinner(winner)
      setPhase('gameEnd')
    })

    return () => {
      console.log('Cleaning up socket listeners for room:', roomId)
      socket.off('playerUpdate')
      socket.off('newRound')
      socket.off('submissionsReceived')
      socket.off('votingStart')
      socket.off('roundResults')
      socket.off('gameEnd')
    }
  }, [socket, roomId])

  return (
    <div className="game-room">
      <h2>Round {round} - {letters.join('')}</h2>
      <PlayerList players={players} />
      <p>Letters: {letters.join('') || 'None yet'}</p>
      
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