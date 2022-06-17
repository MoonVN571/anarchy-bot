const { sendBotLog, sendGlobalChat, getUptime } = require('../functions/minecraft');

module.exports = {
    name: 'end',
    execute (bot) {
        console.log("Bot đã mất kết nối");

        bot.exited = true;
        bot.uptime = 0;

        setTimeout(() => {
            require('../bot.js').createBot();
        },  3 * 60 * 1000);

        if(!bot.logged) return;

        sendBotLog('disconnect', `Bot đã mất kết nối đến server. Kết nối lại sau 3 phút.\nThời gian trong hàng chờ là undefined. Thời gian trong server là ${getUptime(bot, 'vi')}`);

        sendGlobalChat('🏮 Bot đã mất kết nối đến server. 🏮');
    }
}
