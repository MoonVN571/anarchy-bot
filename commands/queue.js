const { getQueue } = require('../games/functions/mcUtils');
module.exports = {
    name: 'queue',
    aliases: ['q', 'que'],
    async execute(bot, username, args) {
        let queue = await getQueue();
        bot.sendMessage('whisper', `Hàng chờ: ${queue}`);
    }
}