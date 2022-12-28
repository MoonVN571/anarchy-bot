const { log } = require("../utils");
function getPlayersList(bot) {
    if (!bot?.players) return [];
    const players = Object.values(bot.players).map(d => d.username);
    return players;
}
function getPlayersDataList(bot) {
    if (!bot?.players) return [];
    const players = Object.values(bot.players).map(d => d);
    return players;
}
function solveAlotMessage(bot) {
    if (bot.data.arrayMessages.length > 0) {
        if (bot.dev) log('[DEV]: ' + bot.data.arrayMessages[0]);
        else bot.chat(bot.data.arrayMessages[0]);
        bot.data.arrayMessages.shift();
    }
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}
module.exports = {
    getPlayersList,
    getPlayersDataList,
    solveAlotMessage
}
