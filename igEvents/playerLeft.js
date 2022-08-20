const { sendGlobalChat } = require('../functions/minecraft');
const seen = require('../db/seen');

module.exports = {
    name: 'playerLeft',

    async execute(bot, player) {
        if (!bot.data.mainServer) return;

        let seenData = await seen.findOne({ username: player.username });
        if (!seenData) await seen.create({ username: player.username, time: Date.now() });
        else {
            seenData.time = Date.now();
            seenData.save();
        }

        // sendGlobalChat(bot, player.username + ' đã thoát khỏi server.');
    }
}
