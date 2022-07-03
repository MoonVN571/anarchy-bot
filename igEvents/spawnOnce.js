const { sendBotLog } = require('../functions/minecraft');

module.exports = {
    name: 'spawn',
    once: true,
    execute (bot) {
        sendBotLog('join', `Bot đã kết nối đến server!`);
        bot.queueStart = Date.now();
    }
}