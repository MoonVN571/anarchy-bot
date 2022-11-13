module.exports = {
    stats: {
        deaths: /^([^ ]*) (?:đã bị té gãy chân)(.*)$/,
        killBefore: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAfter: /^([^ ]*) (?:đã bị thông|đã bị giết bởi) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    notFoundPlayers: 'Player not found',
    manager: {
        adminGame: ['MoonVN'],
        adminBot: ['425599739837284362']
    }
}
