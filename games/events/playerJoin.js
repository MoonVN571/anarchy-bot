const { sendGlobalChat } = require('../functions/chat');
const seen = require('../../databases/seen');
const jd = require('../../databases/joindate');
const { getPlayersList } = require('../functions/mcUtils');
module.exports = {
    name: 'playerJoined',
    async execute(bot, player) {
        bot.data.countPlayers++;
        if ((!bot.data.mainServer && player.username !== bot.username)
            || bot.data.deathList.indexOf(player.username) > -1) return;
        let jdData = await jd.findOne({ username: player.username });
        if (!jdData) await jd.create({ username: player.username, time: Date.now() });
        let seenData = await seen.findOne({ username: player.username });
        if (!seenData) await seen.create({ username: player.username, time: Date.now() });
        else {
            seenData['time'] = Date.now();
            seenData.save();
        }
        if (bot.data.countPlayers <= getPlayersList(bot).length + 1) return;
        sendGlobalChat(bot, player.username + ' đã tham gia vào server.');
    }
}
