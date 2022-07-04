const client = require('../index').client;

client.on('rateLimit',data=>{
    client.channels.cache.get('993497805312233592')
    .send({
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
    }).catch(()=>{});
});