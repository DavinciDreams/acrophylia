function addBotPlayers(players) {
    const botCount = 4 - players.length
    const botNames = ['Bot1', 'Bot2', 'Bot3', 'Bot4']
    
    for (let i = 0; i < botCount; i++) {
      players.push({
        id: `bot_${i}`,
        name: botNames[i],
        score: 0,
        isBot: true
      })
    }
    return players
  }
  
  module.exports = {
    addBotPlayers
  }