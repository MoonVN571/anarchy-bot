module.exports = {
    stats: {
        deaths: /^([^ ]*) (?:starved to death|burned to death|discovered floor was lava|withered away|tried to swim in lava|hit the ground too hard|died|drowned|was playing with poison|was pricked to death|flew into a wall|was playing with magic|was playing with tnt|thought lava was a hot tub|fell out of the world|was playing on a magma block too long|bắn bản thân|ran out of food, and died|fell from a high place|blew up|was burnt to a crisp|was squished to death)(.*)$/,
        killBef: /^([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAft: /^([^ ]*) (?:was killed by|was slain by|walked into danger zone due to|was pummeled by|was blown up by|was burnt to a crisp whilst fighting|was shot by) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) (?:Giết) ([^ ]*)(.*)$/
    }
}
