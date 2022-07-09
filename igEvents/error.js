const { createWebhook } = require('../functions/botFunc');

require('dotenv').config();

module.exports = {
    name: 'error',
    execute (bot, err) {
        createWebhook(process.env.WEBHOOK_ERROR_URL, {
            embeds: [{
                author: {
                    name: 'Bot Error',
                },
                description: err.message,
                fields: [{
                    value: 'Detail',
                    value: err.toString()
                }],
                color: 'RED',
                timestamp: new Date()
            }]
        });
    }
}