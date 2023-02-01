const { sendGlobalChat } = require('../functions/chat');
const seen = require('../../databases/seen');
module.exports = {
    name: 'playerLeft',
    async execute(bot, player) {
        if (!bot.data.mainServer
            || bot.data.deathList.indexOf(player.username) > -1) return;
        sendGlobalChat(bot, player.username + ' đã thoát khỏi server.');
        let seenData = await seen.findOne({
            username: {
                $regex: new RegExp(`^${player.username}$`), $options: 'i'
            }
        });
        if (!seenData) await seen.create({ username: player.username, time: Date.now() });
        else {
            seenData['time'] = Date.now();
            seenData['left_count'] = (seenData['left_count'] || 0) + 1;
            seenData.save();
        }
    }
}
