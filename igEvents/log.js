const { sendBotLog, sendGlobalChat } = require('../functions/minecraft');

module.exports = {
    name: 'spawn',
    once: true,
    execute (bot) {
        sendBotLog('join', `Bot đã kết nối đến server!`);
        sendGlobalChat(bot, '☘️ Bot đang vào server ☘️');
    }
}
