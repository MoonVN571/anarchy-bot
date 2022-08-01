require('dotenv').config();

module.exports = {
    name: 'windowOpen',
    async execute (bot, window) {
        window.requiresConfirmation = false;

        if(window.slots.length == 63) return bot.clickWindow(13,0,0);

        let pin = process.env.PIN.split("");
        await bot.clickWindow(pin[0], 0, 0);
        await bot.clickWindow(pin[1], 0, 0);
        await bot.clickWindow(pin[2], 0, 0);
        await bot.clickWindow(pin[3], 0, 0);
    }
}