function addBotPlayers(players) {
  const minPlayers = 4
  const botsToAdd = minPlayers - players.length
  const botPlayers = []

  for (let i = 0; i < botsToAdd; i++) {
    botPlayers.push({
      id: `bot_${i}`,
      name: `Bot${i + 1}`,
      score: 0,
      isBot: true
    })
  }

  return [...players, ...botPlayers]
}

module.exports = { addBotPlayers }