const pt = require('../db/playtime');

module.exports = {
    name: 'spawn',
    once: false,
    execute (bot) {
        bot.logged = true;
        if(bot.players.gamemode == 0) bot.mainServer = true;
    }
}

