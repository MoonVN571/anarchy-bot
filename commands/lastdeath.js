const msgs = require("../databases/msgs");
const { getDorHMS } = require("../functions/utils");
module.exports = {
    name: 'firstkill',
    aliases: ['fk'],
    async execute(bot, username, args) {
        const name = args[0] || username;
        const data = await msgs.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let time = data.last_death?.time;
        let msg = data.last_death?.msg;
        if (!data || !msg) return bot.sendMessage('whisper', bot.notFoundPlayers);
        bot.sendMessage('whisper', `${name} : `
            + ` ${msg}`
            + ` (${getDorHMS((Date.now() - time) / 1000, false)} trước) [Tính từ 11/01/23]`);
    }
}