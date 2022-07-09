const { Client, Message } = require('discord.js');
const pt = require('../../db/playtime');
const { getDorHMS } = require('../../functions/utils');

module.exports = {
    name: 'playtime',
    description: 'Xem thời gian chơi của player',
    aliases: ['pt'],
    categories: 'players',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        let name = args[0] || 'mo0nbot';
        

        let mapData = (await pt.find()).filter(data => data.username.toLowerCase() == name.toLowerCase());
        let ptData = mapData[0];

        if (!ptData) return message.sendMessage(message.notFoundPlayers);

        message.sendMessage('**' + name + '** : '
            + getDorHMS(ptData.time / 1000, true, true));
    }
}
