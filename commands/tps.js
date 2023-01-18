module.exports = {
    name: 'tps',
    async execute(bot, username, args) {
        bot.sendMessage('whisper', `Server TPS: ${client.data.tps || 20} (tab)`);
    }
}
