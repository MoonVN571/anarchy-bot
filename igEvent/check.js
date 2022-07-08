const { sendBotLog } = require("../functions/minecraft");
const { getDorHMS } = require("../functions/utils");

module.exports = {
    name: 'login',
    once: false,
    execute (
        bot.logged = true;
        
        if(bot.player?.gamemode !== 0) return;
        bot.mainServer = true;
        return;
        bot.uptime = Date.now();

        sendBotLog('queue', 'Đã đợi ' + getDorHMS((Date.now() - bot.queueStart)/1000, true, true) + " trước khi vào server.");
    }
}
