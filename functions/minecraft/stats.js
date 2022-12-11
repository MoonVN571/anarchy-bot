const { getPlayersList } = require('./mcUtils');
const kd = require('../../db/stats');
const set = require('../../data');
const { log } = require("../utils.js");
module.exports.isDeathMessage = (msg) => {
    let message = msg.split("[DM] ").slice(1).join(" ");
    if (message.match(set.stats.deaths)
        || message.match(set.stats.killAfter)
        || message.match(set.stats.killBefore)
        || message.match(set.stats.noStats)) return true;
}

module.exports.save = async (bot, cont) => {
    let content = cont.split("[DM] ").slice(1).join(" ");
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

        let kdData = await kd.findOne({ username: username });
        if (!kdData) return kd.create({ username: username, deaths: 1, kills: 0 });

            if (bot.config.dev) return;
            kdData.deaths += 1;
            kdData.save();
    }

    async function saveKills(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;

        let kdData = await kd.findOne({ username: username });
        if (!kdData) return kd.create({ username: username, deaths: 0, kills: 1 });

        if (bot.config.dev) return;
        kdData.kills += 1;
        kdData.save();
    }
}
