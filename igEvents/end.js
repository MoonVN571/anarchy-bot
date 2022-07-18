const { sendBotLog, getUptime } = require('../functions/minecraft');
const { setStatus } = require('../functions/botFunc');

module.exports = {
    name: 'end',
    
    execute (bot, reason) {
        console.log(reason);

        console.log("Bot đã mất kết nối");
        setStatus('idle', 'Watching', 'chờ kết nối!');

        if(reason == 'force') create();
        else setTimeout(create,  3 * 60 * 1000);

        function create() {
            require('../bot.js').createBot();
        }

        if(!bot.logged) return;
        
        sendBotLog('disconnect', `Bot đã mất kết nối đến server. Kết nối lại sau 3 phút.\nThời gian trong server là ${getUptime(bot, true)}`);

        bot.data.logged = false;
        bot.data.uptime = Date.now();
    }
}
