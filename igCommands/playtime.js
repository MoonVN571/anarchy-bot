const { Bot } = require('mineflayer');
const pt = require('../db/playtime');
const { getDorHMS } = require('../functions/utils');

module.exports = {
    name: 'playtime',
    aliases: ['pt'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;

        let mapData = (await pt.find()).filter(data => data.username.toLowerCase() == name.toLowerCase());
        let ptData = mapData[0];

        if (!ptData) return bot.sendMessage('whisper', bot.notFoundPlayers);

        bot.sendMessage('whisper', name + ' : '
            + getDorHMS(ptData.time / 1000, true, true));
    }
}
