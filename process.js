const { createWebhook } = require('./functions/botFunc');
require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.log(err);

    createWebhook({ url: process.env.WEBHOOK_ERRORS_URL }, {
        embeds: [{
            author: {
                name: 'Processing ERROR'
            },
            description: err.message ? err.message : "Unknown",
            fields: [
                {
                    name: 'Detail',
                    value: '```' + err.toString() + '```',
                }
            ],
            timestamp: Date.now(),
            color: "RED"
        }]
    });
});
