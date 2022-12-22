const { getPlayer } = require("../functions/minecraft/mcUtils");
module.exports = {
    name: 'ping',
    async execute(bot, username, args) {
        if (username.content) username = 'mo0nbot3';
        let name = args[0] || username;
        let find = getPlayer(bot, name);
        if (find.length == 0) return bot.sendMessage('whisper', bot.data.notFoundPlayers);
        let ping = find[0].ping;
        if (ping == 0) bot.sendMessage('whisper', "Server chưa ping người chơi này.");
        else bot.sendMessage('whisper', name + ' : ' + find[0].ping + 'ms.');
    }
}
