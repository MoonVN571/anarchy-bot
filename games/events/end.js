const { callBot } = require('../index.js');
const { sendGlobalChat } = require('../functions/chat.js');
const { log } = require('../../functions/utils.js');
module.exports = {
    name: 'end',
    async execute(bot, reason) {
        log(reason);
        sendGlobalChat(bot, reason);
        log("Bot disconnected!");
        if (reason == 'force') callBot();
        else if (bot.data.fastReconnect) callBot(3 * 1000);
        else callBot(60 * 1000);
        if (!bot.data.logged) return;
        bot.data.logged = false;
        bot.data.mainServer = false;
    }
}
