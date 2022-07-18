let config = {
    prefix: "$",
    dev: false
};

if(config.dev) config.prefix = "dev$";

require('./mongoose');

module.exports = { config };