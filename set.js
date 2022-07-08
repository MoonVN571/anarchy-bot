module.exports = {
    stats: {
        deaths: /^([^ ]*) (?:killed themselves|was playing with poison|was playing with tnt|tried sleeping in the nether :kappa:|was playing on a magma block too long|was pricked to death|flew into a wall|blew up|ran out of food, and died|thought standing in fire was a good idea|died to a wither skull|was playing with magic|thought they could swim forever|was squished to death|shot themselves|fell into the void|died in a unique way|đã cố gắng tập bơi trong lava|fell from a high place|was burnt to a crisp)(.*)$/,
        killBef: /^([^ ]*) (?:deo co) ([^ ]*)(.*)$/,
        killAft: /^([^ ]*) (?:tried playing with|đã được|stood too close to|was spat on by a|was ganed up on by some|tried climbing to greater heights and fell off|was ganged up on by some|was pushed off a high place by|was shot by|was blown up by a|was slain by|đã bị) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    messageArray: [
        'Xem K/D của ai đó hoặc bản thân, sử dụng !kd <tên>',
        'Xem thời gian chơi của ai đó hoặc bản thân, sử dụng !pt <tên>',
        'Xem ai đó lần đầu tham gia vào server ngày nào, bao lâu, sử dụng !jd <tên>',
        'Xem toạ độ của bot, sử dụng !coords',
        'Xem ping của ai đó, sử dụng !ping <tên>',
        'Tham gia discord developer của bot, link: https://discord.mo0nbot.tk/',
    ]
}
