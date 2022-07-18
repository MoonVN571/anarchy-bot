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

        let find = Object.values(bot.players).filter(data => data.username.toLowerCase() == name.toLowerCase());
        if (find.length == 0) return bot.sendMessage('whisper', bot.data.notFoundPlayers);

        let ping = find[0].ping;
        if (ping == 0) bot.sendMessage('whisper', "Server chưa ping người chơi này.");
        else bot.sendMessage('whisper', name + ' : ' + find[0].ping + 'ms.');
    }
}
