const { getPlayersDataList } = require("../games/functions/mcUtils")
module.exports = {
    name: 'worstping',
    aliases: ['wp'],
    gameOnly: true,
    async execute(bot, username, args) {
        let data = getPlayersDataList(bot)
            .filter(player => player.ping > 0).sort((a, b) => b.ping - a.ping)[0];
        bot.sendMessage('whisper', `${data.username} : ${data.ping}ms`);
    }
}