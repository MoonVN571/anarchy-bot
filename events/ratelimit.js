const { Colors, WebhookClient } = require('discord.js');
const { config } = require('../bot');
const client = require('../discord').client;
require('dotenv').config();

client.rest.on('rateLimited', data => {
    let ignore = ['986599157068361734', '987204059838709780'];
    if(ignore.indexOf(data.majorParameter) > -1) return;

    new WebhookClient({ url: process.env.WEBHOOK_ERRORS_URL }).send({
        embeds: [{
            author: {
                name: 'Ralimited - ' + config.dev,
            },
            fields: [
                {
                    name: 'Major Parameter',
                    value: data.majorParameter,
                    inline: true
                },
                {
                    name: 'Giới hạn Global',
                    value: data.global ? 'True' : 'False',
                    inline: true
                },
                {
                    name: 'Method',
                    value: data.method,
                    inline: true
                },
                {
                    name: 'URL',
                    value: data.url,
                    inline: true
                },
                {
                    name: 'Timeout',
                    value: data.timeToReset.toString(),
                    inline: true
                },
                {
                    name: 'Giới hạn Requests',
                    value: data.limit.toString(),
                    inline: true
                }
            ],
            color: Colors.Red,
            timestamp: new Date().toISOString()
        }]
    }).catch(err => console.log(err));
});