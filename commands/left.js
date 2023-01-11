const seen = require("../databases/seen");
module.exports = {
    name: 'left',
    async execute(bot, username, args) {
        const name = args[0] || username;
        const data = await seen.findOne({
            username: {
                $regex: new RegExp(`^${name}$`), $options: 'i'
            }
        });
        if (!data) return bot.sendMessage('whisper', bot.notFoundPlayers);
        bot.sendMessage('whisper', `${name} : ${data.left_count || 0} lần [Tính từ 11/01/23]`);
    }
}