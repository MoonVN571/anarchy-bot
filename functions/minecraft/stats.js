const { getPlayersList } = require('./mcUtils');
const players = require('../../databases/players');
const set = require('../../data');
module.exports.isDeathMessage = (msg) => {
    let message = msg?.trim() || msg;
    if (message.match(set.stats.deaths)
        || message.match(set.stats.killAfter)
        || message.match(set.stats.killBefore)
        || message.match(set.stats.noStats)) return true;
}

module.exports.save = async (bot, cont) => {
    let content = cont?.trim() || cont;
    let deathsRegex = require('../../data').stats.deaths;
    let killAfterRegex = set.stats.killAfter;
    let killBeforeRegex = set.stats.killBefore;
    if (content.match(deathsRegex)) {
        let username = content.match(deathsRegex);
        saveDeaths(username[1]);
    }
    if (content.match(killAfterRegex)) {
        let usernameList = content.match(killAfterRegex);
        let uname = usernameList[2];
        if (uname.includes('\'')) uname = uname.split('\'')[0];
        if (uname?.split(" ").length > 1) uname = uname.split(' ')[0];
        saveDeaths(usernameList[1]);
        saveKills(uname);
    }
    if (content.match(killBeforeRegex)) {
        let usernameList = content.match(killBeforeRegex);
        saveDeaths(usernameList[2]);
        saveKills(usernameList[1]);
    }
    async function saveDeaths(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;
        let data = await players.findOne({ username: username });
        if (!data) data = await players.create({ username: username });
        if (bot.config.dev) return;
        data.stats.deaths += 1;
        data.save();
    }
    async function saveKills(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;
        let data = await players.findOne({ username: username });
        if (!data) data = await players.create({ username: username });
        if (bot.config.dev) return;
        data.stats.kills += 1;
        data.save();
    }
}
