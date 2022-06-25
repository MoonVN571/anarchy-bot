const { Bot } = require('mineflayer');
module.exports = {
    name: 'ping',
    aliases: [],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let find = Object.values(bot.players).filter(data=>data.username==args[0] || data.username==username);

        if(!find || find.length == 0) return;
        else bot.sendMessage('whisper', (args[0]?args[0]:username) + ' : ' + find[0].ping + 'ms.');
    }
}