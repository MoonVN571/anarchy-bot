const { Bot } = require('mineflayer');
module.exports = {
    name: 'ping',
    aliases: [],
    admin: true,
    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        // bot.sendMessage('whisper', 'quit');
        bot.quit();
    }
}