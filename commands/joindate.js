const players = require('../databases/players');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'joindate',
    aliases: ['jd', 'date'],
    async executeIngame(bot, username, args) {
        let name = args[0] || username;
        let data = (await players.find()).find(data => data.username.toLowerCase() == name.toLowerCase());
        if (!data || !data.joindate) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let date = new Date(data.joindate);
        let days = getDorHMS((Date.now() - data.joindate) / 1000, true);
        bot.sendMessage('whisper', name + ' joined at '
            + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + ' (' + days + ' days ago)');
    }
}
