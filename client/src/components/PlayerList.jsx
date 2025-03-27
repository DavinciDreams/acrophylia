export default function PlayerList({ players }) {
  const styles = {
    container: {
      backgroundColor: '#ffffff',
      border: '4px solid #000000',
      boxShadow: '6px 6px 0px #000000',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      width: '100%',
      maxWidth: '800px',
    },
    title: {
      fontFamily: "'Space Mono', monospace",
      fontSize: '1.5rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: '1rem',
      position: 'relative',
      display: 'inline-block',
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    listItem: {
      padding: '0.75rem',
      marginBottom: '0.75rem',
      border: '2px solid #000000',
      backgroundColor: '#f0f0f0',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    playerName: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    score: {
      backgroundColor: '#ffde59',
      padding: '0.25rem 0.5rem',
      border: '2px solid #000000',
      fontFamily: "'Space Mono', monospace",
    },
    botBadge: {
      backgroundColor: '#00c2ff',
      color: '#000000',
      padding: '0.25rem 0.5rem',
      border: '2px solid #000000',
      marginLeft: '0.5rem',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      fontFamily: "'Space Mono', monospace",
    }
  };

  return (
    <div style={styles.container} className="player-list">
      <h3 style={styles.title}>PLAYERS ({players.length})</h3>
      <ul style={styles.list}>
        {players.map(player => (
          <li key={player.id} style={styles.listItem}>
            <div style={styles.playerName}>
              {player.name || player.id}
              {player.isBot && <span style={styles.botBadge}>BOT</span>}
            </div>
            <div style={styles.score}>{player.score}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}