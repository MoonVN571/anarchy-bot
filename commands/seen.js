const players = require('../databases/players');
const { getDorHMS, legitNumber } = require('../functions/utils');
module.exports = {
    name: 'seen',
    aliases: ['see', 'lastseen', 'ls'],
    async executeIngame(bot, username, args) {
        let name = args[0] || username;
        let data = (await players.find()).find(data => data.username.toLowerCase() == name.toLowerCase());
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let date = new Date(data.lastseen);
        let days = getDorHMS((Date.now() - data.lastseen) / 1000, true);
        bot.sendMessage('whisper', name + ' lastseen at '
            + date.toLocaleTimeString() + ' ' + date.toLocaleDateString() + ' (' + days + ' days ago)');
    }
}
