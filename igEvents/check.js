const { sendBotLog } = require("../functions/minecraft");
const { getDorHMS } = require("../functions/utils");

module.exports = {
    name: 'spawn',
    once: false,
    execute (bot) {
        bot.logged = true;
        
        if(bot.player?.gamemode !== 0) return;
        if(bot.mainServer) return;
        sendBotLog('queue', 'Đã đợi ' + getDorHMS((Date.now() - bot.queueStart)/1000, true, true) + " trước khi vào server");
        bot.mainServer = true;
        bot.uptime = Date.now();
    }
}
