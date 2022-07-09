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
        let name = args[0] || username;

        let find = Object.values(bot.players).filter(data => data.username == name);

        if (!find || find.length == 0) return;
        else bot.sendMessage('whisper', name + ' : ' + find[0].ping + 'ms.');
    }
}