const { createWebhook } = require('./functions/utils');
require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.log(err);

    createWebhook(process.env.WEBHOOK_ERROR_URL, {
        embeds: [
            {
                author: {
                    name: 'Processing ERROR'
                },
                description: err.message ? err.message : "Unknown message",
                fields: [
                    {
                        name: 'Detail',
                        value: '```' + err + '```',
                    }
                ],
                timestamp: Date.now(),
                color: "RED"
            }
        ]
    });
});
