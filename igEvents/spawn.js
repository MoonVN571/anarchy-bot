const { sendBotLog, sendGlobalChat } = require('../functions/minecraft');

module.exports = {
    name: 'spawn',
    once: false,
    execute (bot) {
        bot.logged = true;
        if(bot.player.gamemode == 0) bot.mainServer = true;
    }
}

