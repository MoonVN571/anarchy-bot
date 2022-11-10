const players = require('../databases/players');
module.exports = {
    name: 'stats',
    aliases: ['kd'],
    async executeIngame(bot, username, args) {
        let name = args[0] || username;
        let data = (await players.find()).find(data => data.username.toLowerCase() == name.toLowerCase());
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let kills = data.stats.kills || 0;
        let deaths = data.stats.deaths || 0;
        let kda = kills / deaths || 0.00;
        bot.sendMessage('whisper', name + ' - ' + kills + " kills - " + deaths + " deaths - " + kda.toFixed(2));
    }
}
