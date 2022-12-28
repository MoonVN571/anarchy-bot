const { getPlayersList } = require('./mcUtils');
const stats = require('../../db/stats');
module.exports.isDeathMsgs = (bot, msg) => {
    const message = msg.split(bot.setting.stats.prefix).slice(1).join(" ");
    const settings = bot.setting.stats;
    if (message.match(settings.deaths)
        || message.match(settings.killAfter)
        || message.match(settings.killBefore)
        || message.match(settings.noStats)) return true;
}
module.exports.save = async (bot, msg) => {
    const message = msg.split("[ANARCHYVN]").slice(1).join(" ");
    const settings = bot.setting;
    let deathsRegex = settings.stats.deaths;
    let killAfterRegex = settings.stats.killAfter;
    let killBeforeRegex = settings.stats.killBefore;
    if (message.match(deathsRegex)) {
        let username = message.match(deathsRegex);
        saveDeaths(username[1]);
    }
    if (message.match(killAfterRegex)) {
        let usernameList = message.match(killAfterRegex);
        let uname = usernameList[2];
        if (uname.includes('\'')) uname = uname.split('\'')[0];
        if (uname?.split(" ").length > 1) uname = uname.split(' ')[0];
        saveDeaths(usernameList[1]);
        saveKills(uname);
    }
    if (message.match(killBeforeRegex)) {
        let usernameList = message.match(killBeforeRegex);
        saveDeaths(usernameList[2]);
        saveKills(usernameList[1]);
    }
    async function saveDeaths(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;
        bot.data.deathList.push(username);
        setTimeout(() => bot.data.deathList = bot.data.deathList.filter(name => username !== name), 1000);
        const kdData = await stats.find({
            username: {
                $regex: new RegExp(`^${username}$`), $options: 'i'
            }
        })[0];
        if (!kdData) return stats.create({ username: username, deaths: 1, kills: 0 });
        if (bot.dev) return;
        kdData.deaths += 1;
        kdData.save();
    }
    async function saveKills(username) {
        if (getPlayersList(bot).indexOf(username) < 0) return;
        const kdData = await stats.find({
            username: {
                $regex: new RegExp(`^${username}$`), $options: 'i'
            }
        })[0];
        if (!kdData) return stats.create({ username: username, deaths: 0, kills: 1 });
        if (bot.dev) return;
        kdData.kills += 1;
        kdData.save();
    }
}
