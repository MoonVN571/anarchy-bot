const { log } = require('../../functions/utils.js');
module.exports = {
    name: 'end',
    async execute(bot, reason) {
        log(reason);
        log("Bot disconnected!");
        if (reason == 'force') bot.destroy();
        else if (bot.data.fastReconnect) bot.destroy(3 * 1000);
        else bot.destroy(60 * 1000);
        if (!bot.data.logged) return;
        bot.data.logged = false;
        bot.data.mainServer = false;
    }
}
