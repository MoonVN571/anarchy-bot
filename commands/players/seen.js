const { Client, Message } = require('discord.js');

const seen = require('../../db/seen');
const { getDorHMS, legitNumber } = require('../../functions/utils');

module.exports = {
    name: 'seen',
    description: 'Xem lần cuối nhìn thấy player',
    aliases: ['see', 'lastseen', 'ls'],
    categories: 'players',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        let name = args[0] || 'mo0nbot';

        let mapData = (await seen.find()).filter(data => data.username.toLowerCase() == name.toLowerCase());
        let seenData = mapData[0];

        if (!seenData) return message.sendMessage(message.notFoundPlayers);

        let date = new Date(seenData.time);

        message.sendMessage('**' + name + '** : '
            + legitNumber(date.getDate(), 2)
            + '.' + legitNumber(date.getMonth() + 1, 2)
            + '.' + date.getFullYear() + ' - '
            + legitNumber(getDorHMS((Date.now() - seenData.time) / 1000, true))
            + ' trước');
    }
}
