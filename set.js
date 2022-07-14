module.exports = {
    // regex để tính death message
    // credits to moobot
    stats: {
        deaths: /^([^ ]*) (?:blew up! They were playing around with an end-crystal!|thought lava was a hot tub|withered away|killed themselves|was playing with poison|was playing with tnt|tried sleeping in the nether :kappa:|was playing on a magma block too long|was pricked to death|flew into a wall|blew up|ran out of food, and died|thought standing in fire was a good idea|died to a wither skull|was playing with magic|thought they could swim forever|was squished to death|shot themselves|fell into the void|died in a unique way|fell from a high place|was burnt to a crisp)(.*)$/,
        killBef: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAft: /^([^ ]*) (?:tried playing with|stood too close to|was spat on by a|was ganed up on by some|tried climbing to greater heights and fell off|was ganged up on by some|was pushed off a high place by|was shot by|was blown up by a|was slain by) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    // Random send message
    messageArray: [
        ' Xem tất cả lệnh của bot tại https://mo0nbot.tk/',
        ' Chat trong server ở discord tại server: https://discord.mo0nbot.tk/',
    ],
    // Text khi k có player data
    notFoundPlayers: 'Không tìm thấy người chơi này.',    
    manager: {
        // Array username admin để thực thi 1 số lệnh trong server
        adminGame: ['MoonX', 'MoonVN'],
        adminBot: ['425599739837284362']
    }
}
