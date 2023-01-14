const { log } = require("../../functions/utils");
module.exports.getPlayersList = (bot) => {
    const players = Object.values(bot.players).map(d => d.username);
    return players;
}
module.exports.getPlayersDataList = (bot) => {
    if (!bot?.players) return [];
    const players = Object.values(bot.players).map(d => d);
    return players;
}
module.exports.getQueue = async () => {
    await require('axios').default.get('https://api.mcsrvstat.us/2/anarchyvn.net').then(res => {
        let data = res.data?.info?.clean;
        if (!data) return;
        let queue = data[1].split('chờ: ')[1];
        return +queue;
    }).catch(err => {
        log(err.message);
    });
}
module.exports.solveAlotMessage = (bot) => {
    if (bot.data.arrayMessages.length > 0) {
        if (bot.dev) log('[DEV]: ' + bot.data.arrayMessages[0]);
        else bot.chat(bot.data.arrayMessages[0]);
        bot.data.arrayMessages.shift();
    }
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}