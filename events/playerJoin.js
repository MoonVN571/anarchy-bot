const { sendGlobalChat } = require('../functions/minecraft');
const { getPlayersList } = require('../functions/minecraft/mcUtils');
const data = require('../databases/players');
module.exports = {
    name: 'playerJoined',
    async execute(bot, player) {
        bot.data.countPlayers++;
        if (!bot.data.mainServer) return;
        let data = await data.findOne({ username: player.username });
        if (!data) data = await data.create({ username: player.username });
        if (!data.joindate) data.joindate = Date.now();
        data.lastseen = Date.now();
        data.save();
        if (bot.data.countPlayers <= getPlayersList(bot).length + 3) return;
        sendGlobalChat(bot, player.username + ' đã tham gia vào server.');
    }
}
