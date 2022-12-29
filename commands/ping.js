const { getPlayersDataList } = require("../games/functions/mcUtils");
module.exports = {
    name: 'ping',
    gameOnly: true,
    async execute(bot, username, args) {
        let name = args[0] || username;
        let data = getPlayersDataList(bot).find(data => data.username == username);
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        let ping = data.ping;
        if (ping == 0) bot.sendMessage('whisper', 'Server chưa ping người chơi này.');
        else bot.sendMessage('whisper', `${name} : ${ping}ms.`);
    }
}
