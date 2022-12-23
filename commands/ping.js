const { getPlayer } = require("../functions/minecraft/mcUtils");
module.exports = {
    name: 'ping',
    async execute(bot, username, args) {
        if (username.content) username = 'mo0nbot3';
        let name = args[0] || username;
        let data = getPlayer(bot, name);
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let ping = data.ping;
        if (ping == 0) bot.sendMessage('whisper', "Server chưa ping người chơi này.");
        else bot.sendMessage('whisper', name + ' : ' + ping + 'ms.');
    }
}
