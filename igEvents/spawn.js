const { sendBotLog, sendGlobalChat } = require('../functions/minecraft');

module.exports = {
    name: 'spawn',
    once: false,
    execute (bot) {
        sendBotLog('join', `Bot đã kết nối đến server!`);
        sendGlobalChat(bot, '☘️ Bot đang vào server ☘️');
        bot.logged = true;
        if(bot.player.gamemode == 0) bot.mainServer = true;
    }
}

