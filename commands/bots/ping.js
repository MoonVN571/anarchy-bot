const { Client, Message } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Xem ping của bot',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        message.sendMessage('Pong! *' + client.ws.ping + 'ms*');
    }
}