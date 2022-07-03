require('dotenv').config();
module.exports = {
    name: 'windowOpen',
    async execute (bot, window) {
        window.requiresConfirmation = false;

        let pin = process.env.PIN;
        await bot.clickWindow(pin.slice(0,1),0,0);
        await bot.clickWindow(pin.slice(1,2),0,0);
        await bot.clickWindow(pin.slice(2,3),0,0);
        await bot.clickWindow(pin.slice(3,4),0,0);

        setTimeout(() => { bot.chat('/2y2c'); }, 7*1000);

        setTimeout(() => { bot.clickWindow(10,0,0) }, 15*1000);

    }
}