const { log } = require('../utils');
const { getPlayersList } = require('./mcUtils');
const kd = require('../../db/stats');
const set = require('../../set');

module.exports.isDeathMessage = (message) => {
    if (!message) return;
    if (message.match(set.stats.deaths)
        || message.match(set.stats.killAft)
        || message.match(set.stats.killBef)
        || message.match(set.stats.noStats)) return true;
}

module.exports.save = async (bot, content) => {
    let deathsRegex = require('../../set').stats.deaths;
    let killAfterRegex = set.stats.killAft;
    let killBeforeRegex = set.stats.killBef;

    if (content.match(deathsRegex)) {
        let username = content.match(deathsRegex);
        // log(username[1] + ' + death');
        saveDeaths(username[1]);
    }

    if (content.match(killAfterRegex)) {
        let usernameList = content.match(killAfterRegex);
        let uname = usernameList[2];

        if (uname.includes('\'')) uname = uname.split('\'')[0];
        if (uname?.split(" ").length > 1) uname = uname.split(' ')[0];

        // log('Death: ' + usernameList[1] + ' - Kill: ' + uname);

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

            // log(username + ' + 1 death');
            if (bot.config.dev) return;
            kdData.deaths += 1;
            kdData.save();
    }

    async function saveKills(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;

        let kdData = await kd.findOne({ username: username });
        if (!kdData) return kd.create({ username: username, deaths: 0, kills: 1 });

        // log(username + ' + 1 kill');
        if (bot.config.dev) return;
        kdData.kills += 1;
        kdData.save();
    }
}