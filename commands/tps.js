module.exports = {
    name: 'tps',
    async execute(bot, username, args) {
        bot.sendMessage('whisper', `Server TPS: ${bot.data.tps || 20} (tab)`);
    }
}
