const axios = require('axios');
const { log } = require('./utils.js');

function getCoords(bot) {
    return {
        x: parseInt(bot.entity.position.x),
        y: parseInt(bot.entity.position.y),
        z: parseInt(bot.entity.position.z)
    }
}

function getPlayersList(bot) {
    return Object.values(bot.players).map(d => d.username);
}

async function getCountPlayersAPI() {
    let players = 0;
    await axios.default.get('https://api.mcsrvstat.us/2/2b2c.org').then(res => {
        players = res.data.players?.online;
    });
    if(isNaN(players)) players = 0;
    
    return players;
}

function solveAlotMessage(bot) {
    if(bot.data.arrayMessages.length <= 0) return;
    log('Thực thi lệnh: ' + bot.data.arrayMessages[0]);
    bot.chat(bot.data.arrayMessages[0]);
    bot.data.arrayMessages.shift();
    setTimeout(() => solveAlotMessage(bot), 5 * 1000);
}

module.exports = {
    getCoords,
    getCountPlayersAPI,
    getPlayersList,
    solveAlotMessage
}
