const msgs = require("../databases/msgs");
const { getDorHMS } = require("../functions/utils");
module.exports = {
    name: 'firstmessages',
    aliases: ['firstmsgs', 'fm'],
    async execute(bot, username, args) {
        const name = args[0] || username;
        const data = await msgs.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let time = data.first_messages?.time;
        let msg = data.first_messages?.msg;
        if (!data || !msg) return bot.sendMessage('whisper', bot.notFoundPlayers);
        bot.sendMessage('whisper', `${name} : `
            + ` ${msg}`
            + ` (${getDorHMS((Date.now() - time) / 1000, false)} trước) [Tính từ 11/01/23]`);
    }
}