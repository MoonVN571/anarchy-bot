const client = require('../index').discord;
client.on('ready',()=>{

    console.log("Logged in to " + client.user.username);

    console.log(client.guilds.cache.size)
    require('../bot').createBot();
    
})