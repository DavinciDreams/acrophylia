export default function PlayerList({ players }) {
    return (
      <div className="player-list">
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map(player => (
            <li key={player.id}>
              {player.name || player.id} - Score: {player.score}
              {player.isBot && ' (Bot)'}
            </li>
          ))}
        </ul>
      </div>
    )
  }