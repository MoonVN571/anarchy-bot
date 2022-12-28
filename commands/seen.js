const seen = require('../databases/seen');
const { getDorHMS, } = require('../functions/utils');
module.exports = {
    name: 'seen',
    aliases: ['see', 'lastseen', 'ls'],
    async execute(bot, username, args) {
        if (username.content) username = 'mo0nbot3';
        const name = args[0] || username;
        const data = (await seen.find({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        }))[0];
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        const date = new Date(data.time);
        bot.sendMessage('whisper', `Nhìn thấy ${name} lần cuối lúc `
            + `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
            + ` (${getDorHMS((Date.now() - data.time) / 1000, false)} trước)`);
    }
}
