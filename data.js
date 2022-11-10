module.exports = {
    stats: {
        deaths: /^([^ ]*) (?:fell from a high place)(.*)$/,
        killBefore: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAfter: /^([^ ]*) (?:was slain by) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:murdered a dog using) ([^ ]*)(.*)$/
    },
    notFoundPlayers: 'Player not found',
    manager: {
        adminGame: ['MoonVN'],
        adminBot: ['425599739837284362']
    }
}
