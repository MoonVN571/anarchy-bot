const { log } = require('../../functions/utils.js');
const { destroyBot } = require('../index.js');
module.exports = {
    name: 'end',
    async execute(bot, reason) {
        log(reason);
        log("Bot disconnected!");
        if (reason == 'force') destroyBot();
        else if (bot.data.fastReconnect) destroyBot(3 * 1000);
        else destroyBot(60 * 1000);
        if (!bot.data.logged) return;
        bot.data.logged = false;
        bot.data.mainServer = false;
    }
}
