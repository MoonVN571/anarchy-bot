const msgs = require('../databases/msgs');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'firstdeath',
    aliases: ['fd'],
    async execute(bot, username, args) {
        const name = args[0] || username;
        const data = await msgs.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        let time = data.first_death?.time;
        let msg = data.first_death?.msg;
        if (!data || !msg) return bot.sendMessage('whisper', bot.notFoundPlayers);
        bot.sendMessage('whisper', `${name} : `
            + ` ${msg}`
            + ` (${getDorHMS((Date.now() - time) / 1000, false)} trước) [Tính từ 11/01/23]`);
    }
}