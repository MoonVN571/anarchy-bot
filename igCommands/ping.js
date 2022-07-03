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
        
        let res = /^[a-zA-Z]+$/.test(name);
        if(!res) name = username;

        let find = Object.values(bot.players).filter(data=>data.username==name);

        if(!find || find.length == 0) return;
        else bot.sendMessage('whisper', (args[0]?args[0]:username) + ' : ' + find[0].ping + 'ms.');
    }
}