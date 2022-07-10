const config = {
    prefix: '$',
    dev: false,
    debug: true
};

// LOGIC: Load Mongoose -> Load Discord -> Load Mineflayer
require('./db/index');

module.exports = { config };