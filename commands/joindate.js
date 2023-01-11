const joindate = require('../databases/joindate');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'joindate',
    aliases: ['jd', 'date'],
    async execute(bot, username, args) {
        const name = args[0] || username;
        const data = await joindate.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        const date = new Date(data.time);
        bot.sendMessage('whisper', `${name} đã tham gia vào`
            + ` ${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
            + ` (${getDorHMS((Date.now() - data.time) / 1000, false)} trước)`);
    }
}
