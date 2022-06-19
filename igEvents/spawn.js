const pt = require('../db/playtime');

module.exports = {
    name: 'spawn',
    once: true,
    execute (bot) {
        bot.logged = true;
    }
}

