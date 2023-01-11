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
        if (bot.data.countPlayers > getPlayersList(bot).length + 1)
            sendGlobalChat(bot, player.username + ' đã tham gia vào server.');
        let jdData = await jd.findOne({
            username: {
                $regex: new RegExp(`^${player.username}$`), $options: 'i'
            }
        });
        if (!jdData) await jd.create({ username: player.username, time: Date.now() });
        let seenData = await seen.findOne({
            username: {
                $regex: new RegExp(`^${player.username}$`), $options: 'i'
            }
        });
        if (!seenData) seenData = await seen.create({ username: player.username });
        else {
            seenData['time'] = Date.now();
            seenData['join_count'] = (seenData['join_count'] || 0) + 1;
            seenData.save();
        }
    }
}
