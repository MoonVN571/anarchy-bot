const server = require('../databases/server');
const { getDorHMS } = require('../functions/utils');
module.exports = {
    name: 'tps',
    async execute(bot, username, args) {
        const data = await server.findOne({});
        bot.sendMessage('whisper', `TPS: ${data?.tps || 20}`
            + ` (${getDorHMS((Date.now() - data.last_updated) / 1000, false)} trước)`);
    }
}
