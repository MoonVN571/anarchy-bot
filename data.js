module.exports = {
    // regex để tính death message
    // Credit Method: moobot
    stats: {
        deaths: /^([^ ]*) (?:did not put their snow suit on before they went to play.|withered away|killed themselves|was playing with poison|was playing with tnt|tried sleeping in the nether :kappa:|was playing on a magma block too long|was pricked to death|flew into a wall|blew up|ran out of food, and died|thought standing in fire was a good idea|died to a wither skull|was playing with magic|thought they could swim forever|was squished to death|shot themselves|fell into the void|died in a unique way|đã cố gắng tập bơi trong lava|fell from a high place|was burnt to a crisp)(.*)$/,
        killBefore: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAfter: /^([^ ]*) (?:was pushed into lava by|tried playing with|stood too close to|was spat on by a|was ganed up on by some|tried climbing to greater heights and fell off|was ganged up on by some|was pushed off a high place by|was shot by|was blown up by a|was slain by) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    // Random message
    messageArray: [
        'Xem tất cả lệnh của bot tại https://mo0nbot.ga/',
        'Chat trong server ở discord tại server: https://discord.mo0nbot.ga/',
    ],
    // Text khi k có player data
    notFoundPlayers: 'Không tìm thấy người chơi này.',    
    manager: {
        // Array username admin để thực thi 1 số lệnh trong server
        adminGame: ['MoonVN'],
        adminBot: ['425599739837284362']
    }
}
