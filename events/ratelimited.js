const client = require('../index').client;
const { createWebhook } = require('../functions/utils');
require('dotenv').config();

client.on('rateLimit',data=>{
    createWebhook(process.env.WEBHOOK_RATELIMIT_URL,{
        embeds: [{
            author: {
                name: 'Bot rateLimit',
            },
            fields: [
                {
                    name: 'Path',
                    value: data.path
                },
                {
                    name: 'Global',
                    value: data.global ? 'True' : 'False'
                },
                {
                    name: 'Method',
                    value: data.method
                },
                {
                    name: 'Route',
                    value: data.route
                },
                {
                    name: 'Timeout',
                    value: data.timeout.toString()
                },
                {
                    name: 'Limit',
                    value: data.limit.toString()
                }
            ],
            color: 'RED',
            timestamp: new Date()
        }]
    });
});
