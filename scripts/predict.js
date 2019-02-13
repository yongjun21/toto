const fs = require('fs')
const {Expectation, BinomialInverseMoment} = require('./chance')

const STRUCTURE = require('../data/structure.json')

const ALLOCATION = {
  '456': {
    'Group 1': {share: 0.33},
    'Group 2': {share: 0.13},
    'Group 3': {share: 0.13},
    'Group 4': {share: 0.13},
    'Group 5': {fixed: 30},
    'Group 6': {fixed: 20}
  },
  '496': {
    'Group 1': {share: 0.38},
    'Group 2': {share: 0.08},
    'Group 3': {share: 0.055},
    'Group 4': {share: 0.03},
    'Group 5': {fixed: 50},
    'Group 6': {fixed: 25},
    'Group 7': {fixed: 10}
  }
}

const test = payoutFactory(STRUCTURE['496'], ALLOCATION['496'], 0.5)(3000000, {}, true, 'System 7')
console.log(test)
fs.writeFileSync('data/tmp.json', JSON.stringify(test, null, 2))

function payoutFactory (structure, allocation, conversion) {
  const odds = {}
  const ordinary = structure['Ordinary'].match
  Object.keys(ordinary).forEach(group => {
    odds[group] = ordinary[group].probability
  })
  delete odds['Group 0']
  return (prizePool, snowballed = {}, isCascade = false, betType = 'Ordinary') => {
    const prizes = getPrizes(allocation, prizePool, snowballed)
    const stakes = Math.round(prizePool / conversion)
    const match = structure[betType].match
    const expectation = new Expectation()
    Object.keys(match).forEach(group => {
      expectation.add(
        'Match ' + group,
        match[group].probability,
        getExpectedOutcome(match[group].payouts, stakes, odds, prizes, isCascade)
      )
    })
    return expectation
  }
}

function getExpectedOutcome (payouts, stakes, odds, prizes, isCascade) {
  const expectation = new Expectation()
  const topGroup = Object.keys(payouts).sort()[0]
  Object.keys(payouts).forEach((group, i) => {
    const expectedShares = payouts[group] + stakes * odds[group]
    if ('pooled' in prizes[group]) {
      let base = prizes[group].pooled
      if (isCascade && group === topGroup && topGroup !== 'Group 1') {
        const cascadeOdd = Object.keys(odds)
          .filter(group => group < topGroup)
          .reduce((prob, group) => prob * Math.pow(1 - odds[group], stakes), 1)
        if (cascadeOdd >= 1e-9) {
          base = new Expectation()
          base.add('Group share', 1, prizes[group].pooled)
          base.add('Casade share', cascadeOdd, prizes['Group 1'].pooled)
        }
      }
      const outcome = new BinomialInverseMoment(base, stakes, odds[group], payouts[group])
      expectation.add(group, payouts[group], outcome, {expectedShares})
    }
    if ('fixed' in prizes[group]) {
      expectation.add(group, payouts[group], prizes[group].fixed)
    }
  })
  return expectation
}

function getPrizes (allocation, prizePool, snowballed) {
  const prizes = {}
  Object.keys(allocation).forEach(group => {
    prizes[group] = {...allocation[group]}
    if ('share' in prizes[group]) {
      prizes[group].pooled = prizes[group].share * prizePool
      if (group in snowballed) prizes[group].pooled += snowballed[group]
    }
  })
  return prizes
}

exports.payoutFactory = payoutFactory
exports.getPayoutUnder496 = payoutFactory(STRUCTURE['496'], ALLOCATION['496'], 0.5)
exports.getPayoutUnder456 = payoutFactory(STRUCTURE['456'], ALLOCATION['456'], 0.25)
