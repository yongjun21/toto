const fs = require('fs')
const {getOdds, getPayouts, combi} = require('./chance')
const {_pick} = require('./helpers')

const groups496 = ['Group 0', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6', 'Group 7']
const groups456 = ['Group 0', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6']

const structure496 = {
  'Ordinary': getStructure(49, 6)(groups496),
  'System 7': getStructure(49, 6, 7)(groups496),
  'System 8': getStructure(49, 6, 8)(groups496),
  'System 9': getStructure(49, 6, 9)(groups496),
  'System 10': getStructure(49, 6, 10)(groups496),
  'System 11': getStructure(49, 6, 11)(groups496),
  'System 12': getStructure(49, 6, 12)(groups496)
}

const structure456 = {
  'Ordinary': getStructure(45, 6)(groups456),
  'System 7': getStructure(45, 6, 7)(groups456),
  'System 8': getStructure(45, 6, 8)(groups456),
  'System 9': getStructure(45, 6, 9)(groups456),
  'System 10': getStructure(45, 6, 10)(groups456),
  'System 11': getStructure(45, 6, 11)(groups456),
  'System 12': getStructure(45, 6, 12)(groups456)
}

function getStructure (available, drawed, picked = drawed) {
  const cost = combi(picked, drawed)
  const odds = getOdds(available, drawed, picked)
  const payouts = getPayouts(available, drawed, picked)
  return groups => {
    const structure = {cost, winning_odds: null, win_something: 0, win_nothing: 1}
    groups.forEach(group => {
      const probability = 1 / odds[group]
      structure[group] = {
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

fs.writeFileSync('data/structure/496.json', JSON.stringify(structure496, null, 2))
fs.writeFileSync('data/structure/456.json', JSON.stringify(structure456, null, 2))
