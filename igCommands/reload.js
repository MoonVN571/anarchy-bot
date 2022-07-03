const { Bot } = require('mineflayer');
module.exports = {
    name: 'reload',
    aliases: [],
    admin: true,
    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        bot.quit('force');
    }
}