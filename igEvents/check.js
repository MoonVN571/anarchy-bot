const { getPlayersList } = require("../functions/minecraft/mcUtils");
const { log } = require("../functions/utils");
module.exports = {
    name: 'spawn',
    async execute(bot) {
        bot.data.spawnCount++;
        if (bot.data.spawnCount == 1) {
            bot.data.logged = true;
            log('Bot đã vào server!');
        }
        if (bot.data.spawnCount >= 4 || bot.player?.gamemode == 0) bot.data.mainServer = true;
        if (bot.data.mainServer) {
            bot.data.uptime = Date.now();
            log(getPlayersList(bot).length, 'players');
        }
    }
}
