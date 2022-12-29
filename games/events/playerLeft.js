const { sendGlobalChat } = require('../functions/chat');
const seen = require('../../databases/seen');
module.exports = {
    name: 'playerLeft',
    async execute(bot, player) {
        if ((!bot.data.mainServer && player.username !== bot.username)
            || bot.data.deathList.indexOf(player.username) > -1) return;
        let seenData = await seen.findOne({ username: player.username });
        if (!seenData) await seen.create({ username: player.username, time: Date.now() });
        else {
            seenData['time'] = Date.now();
            seenData.save();
        }
        sendGlobalChat(bot, player.username + ' đã thoát khỏi server.');
    }
}
