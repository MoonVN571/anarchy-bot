const client = require('../index').client;

client.once('ready',()=>{
    console.log("Đã sẵn sàng hoạt động!");
    
    require('../bot').createBot();
});