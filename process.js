const { createWebhook } = require('./functions/botFunc');
require('dotenv').config();

process.on('uncaughtException', (err) => {
    console.log(err);

    createWebhook({ id: '993499095694057484' }, {
        embeds: [{
            author: {
                name: 'Processing ERROR'
            },
            description: err.message ? err.message : "Unknown message",
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
