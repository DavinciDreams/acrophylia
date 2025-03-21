function generateLetters(round) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const length = round + 2 // 3, 4, 5 letters
    let result = ''
    for (let i = 0; i < length; i++) {
      result += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return result.split('')
  }
  
  function checkMinPlayers(players) {
    return players.length >= 4
  }
  
  module.exports = {
    generateLetters,
    checkMinPlayers
  }