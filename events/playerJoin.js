const { sendGlobalChat } = require('../functions/minecraft');
const { getPlayersList } = require('../functions/minecraft/mcUtils');
const players = require('../databases/players');
module.exports = {
    name: 'playerJoined',
    async execute(bot, player) {
        bot.data.countPlayers++;
        if (!bot.data.mainServer) return;
        let data = await players.findOne({ username: player.username });
        if (!data) data = await players.create({ username: player.username });
        if (!data.joindate) data.joindate = Date.now();
        data.lastseen = Date.now();
        if (!bot.config.dev) await data.save();
        if (bot.data.countPlayers <= getPlayersList(bot).length + 3) return;
        sendGlobalChat(bot, player.username + ' đã tham gia vào server.');
    }
}
