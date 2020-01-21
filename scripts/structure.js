const fs = require('fs')
const {getOdds, getPayouts, combi} = require('./chance')
const {_pick} = require('./helpers')

const structure = {
  '496': {
    'Ordinary': getStructure(49, 6)(7),
    'System 7': getStructure(49, 6, 7)(7),
    'System 8': getStructure(49, 6, 8)(7),
    'System 9': getStructure(49, 6, 9)(7),
    'System 10': getStructure(49, 6, 10)(7),
    'System 11': getStructure(49, 6, 11)(7),
    'System 12': getStructure(49, 6, 12)(7)
  },
  '456': {
    'Ordinary': getStructure(45, 6)(6),
    'System 7': getStructure(45, 6, 7)(6),
    'System 8': getStructure(45, 6, 8)(6),
    'System 9': getStructure(45, 6, 9)(6),
    'System 10': getStructure(45, 6, 10)(6),
    'System 11': getStructure(45, 6, 11)(6),
    'System 12': getStructure(45, 6, 12)(6)
  }
}

function getStructure (available, drawed, picked = drawed) {
  const stakes = combi(picked, drawed)
  const odds = getOdds(available, drawed, picked)
  const payouts = getPayouts(available, drawed, picked)
  return upTo => {
    const groups = []
    for (let k = 0; k <= upTo; k++) {
      groups.push('Group ' + k)
    }
    const structure = {
      stakes,
      winning_odds: null,
      win_something: 0,
      win_nothing: 1,
      match: {}
    }
    groups.forEach(group => {
      const probability = 1 / odds[group]
      structure.match[group] = {
        probability,
        odds: Math.round(odds[group]),
        payouts: _pick(payouts[group], groups)
      }
      structure.win_something += probability
      structure.win_nothing -= probability
    })
    structure.winning_odds = Math.round(1 / structure.win_something)
    return structure
  }
}

fs.writeFileSync('data/structure.json', JSON.stringify(structure, null, 2))
