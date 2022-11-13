const { sendGlobalChat } = require('../functions/minecraft');
const players = require('../databases/players');
module.exports = {
    name: 'playerLeft',
    async execute(bot, player) {
        if (!bot.data.mainServer) return;
        let data = await players.findOne({ username: player.username });
        if (!data) data = await players.create({ username: player.username });
        if (!bot.config.dev) await data.save();
        data.save();
        sendGlobalChat(bot, player.username + ' đã thoát khỏi server.');
    }
}
