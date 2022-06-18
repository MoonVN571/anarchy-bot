module.exports = {
    stats: {
        deaths: /^([^ ]*) ([^ ]*) (?: was playing with poison|was pricked to death|flew into a wall|was playing with magic|was playing with tnt|thought lava was a hot tub|fell into the void|was playing on a magma block too long|bắn bản thân|ran out of food, and died|dập mặt vào tường|fell from a high place|died in a unique way|blew up|thought they could swim forever|was burnt to a crisp|was squished to death|was slain by|thought standing in fire was a good idea)(.*)$/,
        killBef: /^([^ ]*) ([^ ]*) (?:killed) ([^ ]*)(.*)$/,
        killAft: /^([^ ]*) ([^ ]*) (?:was ganed up on by some|was slain by|was shot by a|was blown up by a) ([^ ]*)(.*)$/,
        noStats: /^([^ ]*) ([^ ]*) (?:Giết) ([^ ]*)(.*)$/
    }
}
