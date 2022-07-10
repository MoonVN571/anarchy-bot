const client = require('../discord').client;
const { setStatus } = require('../functions/botFunc');

client.once('ready', () => {
    console.log("Đã sẵn sàng hoạt động!");

    setStatus('idle', 'WATCHING', 'chờ kết nối!');
    require('../bot').createBot();
});