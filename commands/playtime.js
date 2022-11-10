const players = require('../databases/players');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'playtime',
    aliases: ['pt'],
    async executeIngame(bot, username, args) {
        let name = args[0] || username;
        let data = (await players.find()).find(data => data.username.toLowerCase() == name.toLowerCase());
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let time = getDorHMS((data.playtime || 0) / 1000, true, false);
        bot.sendMessage('whisper', name + ' : ' + time);
    }
}
