function addBotPlayers(players, count = Infinity) {
  const botNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Edward'];
  const currentBots = players.filter(p => p.isBot).length;
  const botsToAdd = Math.min(count, botNames.length - currentBots);
  
  for (let i = 0; i < botsToAdd; i++) {
    players.push({
      id: `bot_${Math.random().toString(36).substr(2, 9)}`,
      name: botNames[currentBots + i],
      score: 0,
      isBot: true
    });
  }
  return players;
}

module.exports = { addBotPlayers };