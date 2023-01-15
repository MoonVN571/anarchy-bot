const server = require('../databases/server');
module.exports = {
    name: 'tps',
    async execute(bot, username, args) {
        const data = await server.findOne({});
        bot.sendMessage('whisper', `Server TPS: ${data?.tps || 20}`);
    }
}
