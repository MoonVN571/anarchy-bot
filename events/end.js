const { sendGlobalChat, callBot } = require('../functions/minecraft.js');

module.exports = {
    name: 'end',

    async execute(bot, reason) {
        console.log(reason);
        sendGlobalChat(bot, reason);
        console.log("Bot đã mất kết nối");
        if (reason == 'force') callBot();
        else if (bot.data.fastReconnect) callBot(3 * 1000);
        else callBot(60 * 1000);
        if (!bot.data.logged) return;
        bot.data.logged = false;
    }
}
