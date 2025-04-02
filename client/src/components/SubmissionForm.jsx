import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function SubmissionForm({ gameType, content, category, roomId }) {
  const socket = useSocket()
  const [submission, setSubmission] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate submission based on game type
    if (gameType === 'acronym' && submission.length !== content.length) {
      setError(`Your acronym must use exactly ${content.length} letters`)
      return
    }
    
    if (!submission.trim()) {
      setError('Please enter a submission')
      return
    }
    
    // Clear any previous errors
    setError('')
    
    // Submit content based on game type
    console.log(`Submitting ${gameType}:`, { roomId, submission })
    socket.emit('submitContent', { roomId, submission })
    setSubmission('')
  }

  const renderPrompt = () => {
    switch (gameType) {
      case 'acronym':
        return (
          <div className="prompt-container">
            <h3>Create an acronym using these letters:</h3>
            <div className="letters" data-testid="current-game-type">Acronyms</div>
            <div className="content-display">{Array.isArray(content) ? content.join(' ') : ''}</div>
            <p>Category: {category}</p>
          </div>
        )
      case 'date':
        return (
          <div className="prompt-container">
            <h3>What happened on this date?</h3>
            <div className="date" data-testid="current-game-type">Historical Dates</div>
            <div className="content-display">{content}</div>
            <p>Create a fictional historical event</p>
          </div>
        )
      case 'movie':
        return (
          <div className="prompt-container">
            <h3>Write a plot for this movie:</h3>
            <div className="movie-title" data-testid="current-game-type">Movie Plots</div>
            <div className="content-display">{content}</div>
            <p>Create a brief, creative plot summary</p>
          </div>
        )
      default:
        return <div>Loading...</div>
    }
  }

  const getPlaceholder = () => {
    switch (gameType) {
      case 'acronym':
        return `Enter a phrase using the letters ${Array.isArray(content) ? content.join('') : ''}`
      case 'date':
        return 'Enter a fictional historical event for this date'
      case 'movie':
        return 'Enter a plot summary for this movie'
      default:
        return 'Enter your submission'
    }
  }

  return (
    <div className="submission-form-container">
      {renderPrompt()}
      
      <form onSubmit={handleSubmit}>
        {gameType === 'acronym' ? (
          <input
            type="text"
            value={submission}
            onChange={(e) => setSubmission(e.target.value.toUpperCase())}
            placeholder={getPlaceholder()}
            maxLength={100}
          />
        ) : (
          <textarea
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            placeholder={getPlaceholder()}
            rows={4}
            maxLength={200}
          />
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit">Submit</button>
      </form>
      
      <style jsx>{`
        .submission-form-container {
          margin-bottom: 2rem;
        }
        
        .prompt-container {
          margin-bottom: 1rem;
          padding: 1rem;
          background: #f0f4f8;
          border-radius: 8px;
        }
        
        .content-display {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0;
          padding: 0.5rem;
          background: #e0e8f0;
          border-radius: 4px;
          text-align: center;
        }
        
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        
        textarea {
          resize: vertical;
        }
        
        .error-message {
          color: #d32f2f;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        button {
          padding: 0.75rem 1.5rem;
          background: #4a6fa5;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        button:hover {
          background: #3a5a8f;
        }
      `}</style>
    </div>
  )
}