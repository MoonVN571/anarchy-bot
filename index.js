let config = {
    prefix: "$",
    dev: true
};

if(config.dev) config.prefix = "dev$";

require('./mongoose');

module.exports = { config };