const { log } = require('../utils.js');
function getPlayersList(bot) {
    if (!bot?.players) return [];
    const players = Object.values(bot.players).map(d => d.username);
    return players;
}
function getPlayer(bot, username) {
    return Object.values(bot.players).map(d => d).find(data => data.username == username);
}
function solveAlotMessage(bot) {
    if (bot.data.arrayMessages.length == 0) return;
    log('Thực thi lệnh: ' + bot.data.arrayMessages[0]);
    bot.chat(bot.data.arrayMessages[0]);
    bot.data.arrayMessages.shift();
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}
module.exports = {
    getPlayersList,
    getPlayer,
    solveAlotMessage
}
