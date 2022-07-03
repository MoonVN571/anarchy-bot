const { sendBotLog, getUptime } = require('../functions/minecraft');

module.exports = {
    name: 'end',
    execute (bot, reason) {
        console.log("Bot đã mất kết nối");
        
        if(reason !== 'force') setTimeout(create,  3 * 60 * 1000);
        else create();

        function create() {
            require('../bot.js').createBot();
        }

        if(!bot.logged) return;
        
        sendBotLog('disconnect', `Bot đã mất kết nối đến server. Kết nối lại sau 3 phút.\nThời gian trong server là ${getUptime(bot, 'vi')}`);

        bot.logged = false;
        bot.exited = true;
        bot.uptime = 0;
    }
}
