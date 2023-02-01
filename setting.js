module.exports = {
    // our bot setting on main bot
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
        error: '993499095694057484',
        logs: '995305343456382976'
    },
    authType: 'AdvancedLogin', // AuthMe, AdvancedLogin
    advancedLogin: {
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
        // replace death messages prefix
        prefix: '[ANARCHYVN]',
        deaths: /^([^ ]*) (?:nghĩ rằng nghịch cầu lửa là ngầu|đã ngu tự chết|chết vì hộp sọ khô héo|đã chơi ma túy đến chết|đã phê thuốc độc|tự bắn mình chết sử dụng|bị đè bởi|đã đứng trên khối magma quá lâu|bị bóp chết|đã đăng xuất khỏi trái đất|tập bơi chìm và ngỏm|đã chết khô|chết vì đói|đâm đầu vô tường chết|đã bị sét đánh vỡ đầu|chết ngu vì thích ngủ ở nether|chết ngu vì nghịch anchor tại over-world!|bị thông tới chết|đã bắn ngu tự chết|đã tự thiêu sống bản thân|bóp cu tự sát|đã nổ banh xác|chết ngu vì thích ngủ ở nether :kappa:|chết vì tập chơi end-crystal!|té đập con mẹ nó mặt|tập bơi trong lava|đã bóp chim tự sát|tự kết liễu cuộc đời|đã chết cháy|đã chết vì tập bay)(.*)$/,
        killBefore: /^([^ ]*) (?:đã giết|đã nổ tung xác) ([^ ]*)(.*)$/,
        killAfter: /^([^ ]*) (?:was ganed up on by some|was slain by a bunch of|đã bị đẩy xuống lava chết cháy bởi|đã chết vì cố gắng đấm|đã bị bắn bởi|đã bị giết bởi|đã bị nổ tung xác bởi|đứng quá gần|đã tin người và bị đẩy tét đập con mẹ nó mặt chết bởi|đứng quá gần giường của|đã cố chèo lên cao và rơi xuống|was squished by a|nổ banh xác vì chơi ngu|đã bị phê cần tới chết bởi|đã bị bắn xuyên táo bởi|đã bị nổ cu bởi|đã bị chặt cu bởi|đã bị địt bởi) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    notFoundPlayers: 'Không tìm thấy người chơi này.'
}
