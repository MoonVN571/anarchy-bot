const setting = require('../setting');
require('dotenv').config();

module.exports = {
    name: 'windowOpen',
    async execute (bot, window) {
        window.requiresConfirmation = false;

        // console.log(window.slots.map(s=>s?.displayName||"."), window.slots.length);
        if(window.slots.length == setting.slotInvClick) return bot.clickWindow(setting.slotClick, 0, 0);

        let pin = process.env.PIN.split("");
        await bot.clickWindow(pin[0], 0, 0);
        await bot.clickWindow(pin[1], 0, 0);
        await bot.clickWindow(pin[2], 0, 0);
        await bot.clickWindow(pin[3], 0, 0);
    }
}