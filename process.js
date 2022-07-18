const { WebhookClient, Colors } = require('discord.js');
require('dotenv').config();

process.on('uncaughtException', (err) => {
    new WebhookClient({ url: process.env.WEBHOOK_ERRORS_URL }).send({
        embeds: [{
            author: {
                name: 'Progress ERROR'
            },
            description: err.message ? err.message : "Unknown",
            fields: [
                {
                    name: 'Detail',
                    value: '```' + err.toString() + '```',
                }
            ],
            timestamp: new Date().toISOString(),
            color: Colors.Red
        }]
    });
});
