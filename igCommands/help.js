const { Bot } = require('mineflayer');
module.exports = {
    name: 'help',

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        bot.sendMessage('whisper', 'Xem lệnh tại: https://mo0nbot.tk/');
    }
}