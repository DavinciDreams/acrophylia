import { useState } from 'react'
import { useSocket } from '../lib/socket'

export default function GameLobby({ onGameStart }) {
  const [roomName, setRoomName] = useState('')
  const [rounds, setRounds] = useState(5)
  const [selectedGameTypes, setSelectedGameTypes] = useState({
    acronym: true,
    date: true,
    movie: true
  })
  const socket = useSocket()

  const handleGameTypeToggle = (type) => {
    // Make sure at least one game type is selected
    const newSelectedTypes = { ...selectedGameTypes, [type]: !selectedGameTypes[type] }
    const hasSelectedType = Object.values(newSelectedTypes).some(value => value)
    
    if (hasSelectedType) {
      setSelectedGameTypes(newSelectedTypes)
    }
  }

  const createRoom = () => {
    console.log('Create Room clicked, socket:', socket ? 'connected' : 'not connected')
    if (socket) {
      console.log('Emitting createRoom')
      socket.emit('createRoom')
      socket.on('roomCreated', (roomId) => {
        console.log('Received roomCreated with roomId:', roomId)
        
        // Set room name if provided
        if (roomName) {
          socket.emit('setRoomName', { roomId, roomName })
        }
        
        // Set game options
        const gameTypes = Object.entries(selectedGameTypes)
          .filter(([_, selected]) => selected)
          .map(([type]) => type)
        
        socket.emit('setGameOptions', {
          roomId,
          rounds,
          gameTypes
        })
        
        onGameStart(roomId)
      })
    } else {
      console.log('Cannot create room - socket not connected')
    }
  }

  return (
    <div className="lobby">
      <h1>Acrophylia</h1>
      
      <div className="setup-section">
        <h2>Game Setup</h2>
        
        <div className="form-group">
          <label htmlFor="roomName">Room Name (Optional)</label>
          <input
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="rounds">Number of Rounds</label>
          <select 
            id="rounds"
            value={rounds} 
            onChange={(e) => setRounds(parseInt(e.target.value))}
            data-testid="round-selector"
          >
            <option value="3">3 Rounds</option>
            <option value="5">5 Rounds</option>
            <option value="7">7 Rounds</option>
            <option value="10">10 Rounds</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Game Types</label>
          <p className="info-text">Each round will randomly select from your chosen game types</p>
          
          <div className="game-types-container">
            <label className="game-type-checkbox">
              <input
                type="checkbox"
                checked={selectedGameTypes.acronym}
                onChange={() => handleGameTypeToggle('acronym')}
                data-testid="game-type-acronym"
              />
              Acronyms
            </label>
            
            <label className="game-type-checkbox">
              <input
                type="checkbox"
                checked={selectedGameTypes.date}
                onChange={() => handleGameTypeToggle('date')}
                data-testid="game-type-date"
              />
              Historical Dates
            </label>
            
            <label className="game-type-checkbox">
              <input
                type="checkbox"
                checked={selectedGameTypes.movie}
                onChange={() => handleGameTypeToggle('movie')}
                data-testid="game-type-movie"
              />
              Movie Plots
            </label>
          </div>
        </div>
        
        <button 
          onClick={createRoom} 
          className="create-button"
          data-testid="create-room"
        >
          Create Game
        </button>
      </div>
      
      <style jsx>{`
        .lobby {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }
        
        h1 {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .setup-section {
          background: #f5f5f5;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .form-group {
          margin-bottom: 1.5rem;
        }
        
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }
        
        input, select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .info-text {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 0.75rem;
        }
        
        .game-types-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .game-type-checkbox {
          display: flex;
          align-items: center;
          cursor: pointer;
        }
        
        .game-type-checkbox input {
          width: auto;
          margin-right: 0.5rem;
        }
        
        .create-button {
          width: 100%;
          padding: 0.75rem;
          background: #4a6fa5;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .create-button:hover {
          background: #3a5a8f;
        }
      `}</style>
    </div>
  )
}