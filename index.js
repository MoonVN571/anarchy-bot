const config = {
    prefix: '$',
    devGuild: '794912016237985802',
    dev: false,
    debug: true
};

const logger = {
    errors: '994885312369131561',
    logs: '995306729334112256'
}

// LOGIC: Load Mongoose -> Load Discord -> Load Mineflayer
require('./db/index');

module.exports = { config, logger };