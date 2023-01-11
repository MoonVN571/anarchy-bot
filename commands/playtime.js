const playtime = require('../databases/playtime');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'playtime',
    aliases: ['pt'],
    async execute(bot, username, args) {
        if (username.content) username = 'mo0nbot3';
        const name = args[0] || username;
        const data = await playtime.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        bot.sendMessage('whisper', `${name} : ${getDorHMS(data.time / 1000, true)}`);
    }
}
