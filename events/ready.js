const client = require('../index').discord;

client.on('ready',()=>{
    console.log("Đã sẵn sàng hoạt động!");
    console.log("");
    console.log("Members: " + client.users.cache.size);
    console.log("Servers: " + client.guilds.cache.size);
    console.log("");
    console.log("Bot: " + require('../package.json').version);
    console.log("Discord.js: " + require('../package.json').dependencies['discord.js']);
    console.log("Mineflayer: " + require('../package.json').dependencies['mineflayer']);
    console.log("MongoDB: " + require('../package.json').dependencies['mongoose']);
    console.log("");
    
    require('../bot').createBot();    
});