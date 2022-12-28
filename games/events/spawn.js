const { log } = require("../../functions/utils");
module.exports = {
    name: 'spawn',
    async execute(bot) {
        bot.data.spawnCount++;
        if (bot.data.spawnCount == 1) {
            bot.data.logged = true;
            log('Bot joined to the server!');
        }
        if (bot.data.spawnCount >= 4 || bot.player?.gamemode == 0) bot.data.mainServer = true;
        if (bot.data.mainServer) {
            if (bot.data.uptime == 0) bot.data.uptime = Date.now();
        }
    }
}
