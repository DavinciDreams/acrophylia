export default function PlayerList({ players, leaveRoom }) {

  return (
    <div className="container">
      <div className="section-content">
        <h3 className="section-header">PLAYERS ({players.length})</h3>
        <ul className="player-list">
          {players.map(player => (
            <li key={player.id} className="player-item">
              <div className="player-name">
                {player.name || player.id}
                {player.isBot && <span className="bot-badge">BOT</span>}
              </div>
              <div className="player-score pill">{player.score}</div>
            </li>
          ))}
        </ul>

        <button className="button" onClick={leaveRoom}>
          Leave Room
        </button>
      </div>
    </div>
  )
}