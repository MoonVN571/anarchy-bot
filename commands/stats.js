const stats = require('../databases/stats');
module.exports = {
    name: 'stats',
    aliases: ['kd'],
    async execute(bot, username, args) {
        if (username.content) username = 'mo0nbot3';
        const name = args[0] || username;
        const data = await stats.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        const kills = data.kills || 0;
        const deaths = data.deaths || 0;
        const kda = kills / deaths || 0.00;
        bot.sendMessage('whisper', `${name} - K: ${kills} - D: ${deaths} - K/D: ${kda.toFixed(2)}`);
    }
}
