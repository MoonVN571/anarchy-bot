const { sendBotLog } = require("../functions/minecraft");

module.exports = {
    name: 'spawn',
    once: false,

    async execute(bot) {
        bot.data.spawnCount++;
        
        if (bot.data.spawnCount == 1) {
            bot.data.logged = true;
        }

        if (bot.data.spawnCount >= 4 || bot.player?.gamemode !== 0) bot.data.mainServer = true;

        if (bot.data.mainServer) {
            bot.data.uptime = Date.now();
        }
    }
}
