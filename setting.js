module.exports = {
    botPrefix: '$',
    gamePrefix: '!',
    botOwner: '497768011118280716',
    botName: {
        main: 'mo0nbot3',
        dev: 'mo0nbot5'
    },
    channel: {
        livechat: {
            main: '1001826269664661616',
            dev: '987204059838709780'
        },
        server: {
            main: '1001838578399187055',
            dev: '987204092113879040'
        },
        error: '993499095694057484'
    },
    authType: 'AdvancedLogin', // AuthMe, AdvancedLogin
    advancedLogin: {
        title: ': Enter Pin',
        slotInvClick: 63,
        slotClick: 13,
        joinCmdMessage: ' dùng lệnh/anarchyvn  để vào server.',
        joinCmd: '/anarchyvn',
    },
    authMe: {
        msg: {
            register: '',
            login: '',
            success: ['']
        }
    },
    stats: {
        deaths: /^([^ ]*) (?:chết ngu vì nghịch anchor tại over-world!|bị thông tới chết|đã bắn ngu tự chết|đã tự thiêu sống bản thân|bóp cu tự sát|đã nổ banh xác|chết ngu vì thích ngủ ở nether :kappa:|chết vì tập chơi end-crystal!|té đập con mẹ nó mặt|tập bơi trong lava|đã bóp chim tự sát|tự kết liễu cuộc đời|đã chết cháy|đã chết vì tập bay|tried using the respawn anchor in the over-world!|blew up! They were playing around with an end-crystal!|thought lava was a hot tub|withered away|killed themselves|was playing with poison|was playing with tnt|tried sleeping in the nether :kappa:|was playing on a magma block too long|was pricked to death|flew into a wall|blew up|ran out of food, and died|thought standing in fire was a good idea|died to a wither skull|was playing with magic|thought they could swim forever|was squished to death|shot themselves|fell into the void|died in a unique way|fell from a high place|was burnt to a crisp)(.*)$/,
        killBefore: /^([^ ]*) (?:đã giết) ([^ ]*)(.*)$/,
        killAfter: /^([^ ]*) (?:was squished by a|nổ banh xác vì chơi ngu|đã bị phê cần tới chết bởi|đã bị bắn xuyên táo bởi|đã bị nổ cu bởi|đã bị chặt cu bởi|đã bị địt bởi|was pushed into the void by|was pushed into lava by|tried playing with|stood too close to|was spat on by a|was ganed up on by some|tried climbing to greater heights and fell off|was ganged up on by some|was pushed off a high place by|was shot by|was blown up by a|was slain by) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    notFoundPlayers: 'Không tìm thấy người chơi này.'
}
