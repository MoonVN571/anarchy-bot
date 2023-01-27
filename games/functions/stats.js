const { getPlayersList, isOnline } = require('./mcUtils');
const stats = require('../../databases/stats');
const msgs = require('../../databases/msgs');
module.exports.isDeathMsgs = (bot, message) => {
    const settings = bot.setting.stats;
    if (message.match(settings.deaths)
        || message.match(settings.killAfter)
        || message.match(settings.killBefore)
        || message.match(settings.noStats)) return true;
}
module.exports.save = async (bot, message) => {
    const settings = bot.setting;
    let deathsRegex = settings.stats.deaths;
    let killAfterRegex = settings.stats.killAfter;
    let killBeforeRegex = settings.stats.killBefore;
    if (message.match(deathsRegex)) {
        let username = message.match(deathsRegex);
        saveDeaths(bot, username[1], message);
    }
    if (message.match(killAfterRegex)) {
        let usernameList = message.match(killAfterRegex);
        let uname = usernameList[2];
        if (uname.includes('\'')) uname = uname.split('\'')[0];
        if (uname?.split(" ").length > 1) uname = uname.split(' ')[0];
        saveDeaths(bot, usernameList[1], message);
        saveKills(bot, uname, message);
    }
    if (message.match(killBeforeRegex)) {
        let usernameList = message.match(killBeforeRegex);
        saveDeaths(bot, usernameList[2], message);
        saveKills(bot, usernameList[1], message);
    }
}
async function saveKillMsgs(username, message) {
    db = await msgs.findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (!db) db = await msgs.create({ username: username });
    if (!db.first_kills) db['first_kill'] = {
        msg: message,
        time: Date.now()
    };
    db['last_kill'] = {
        msg: message,
        time: Date.now()
    };
    await db.save();
}
async function saveDeathMsgs(username, message) {
    db = await msgs.findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (!db) db = await msgs.create({ username: username });
    if (!db.first_deaths) db['first_death'] = {
        msg: message,
        time: Date.now()
    };
    db['last_death'] = {
        msg: message,
        time: Date.now()
    };
    await db.save();
}
async function saveDeaths(bot, username, message) {
    if (!isOnline(bot, username)) return;
    bot.data.deathList.push(username);
    setTimeout(() => bot.data.deathList = bot.data.deathList.filter(name => username !== name), 5000);
    saveDeathMsgs(username, message);
    const kdData = await stats.findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (bot.dev) console.log('deaths ' + username, kdData);
    if (!kdData) return stats.create({ username: username, deaths: 1, kills: 0 });
    kdData.deaths += 1;
    kdData.save();
}
async function saveKills(bot, username, message) {
    if (!isOnline(bot, username)) return;
    saveKillMsgs(username, message);
    const kdData = await stats.findOne({
        username: {
            $regex: new RegExp(`^${username}$`), $options: 'i'
        }
    });
    if (bot.dev) console.log('kills ' + username, kdData);
    if (!kdData) return stats.create({ username: username, deaths: 0, kills: 1 });
    kdData.kills += 1;
    kdData.save();
}
