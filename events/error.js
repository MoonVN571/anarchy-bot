const client = require('../index').client;

client.on('error',err=>{
    client.channels.cache.get('993499095694057484')
    .send({
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
    }).catch(()=>{});
});