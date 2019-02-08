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

const test = payoutFactory(STRUCTURE['496'], ALLOCATION['496'], 0.5)(3000000, {}, true, 'Ordinary')
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
        group,
        match[group].probability,
        getExpectedOutcome(match[group].payouts, stakes, odds, prizes, isCascade)
      )
    })
    return expectation
  }
}

function getExpectedOutcome (payouts, stakes, odds, prizes, isCascade) {
  const expectation = new Expectation()
  Object.keys(payouts).forEach((group, i) => {
    const expectedShares = payouts[group] + stakes * odds[group]
    const expectedPrize = 'share' in prizes[group]
                        ? new BinomialInverseMoment(stakes, odds[group], payouts[group])
                            .transform(prizes[group].share, prizes[group].fixed || 0)
                            .transform(payouts[group])
                        : prizes[group].fixed * payouts[group]
    const extras = {
      shares: expectedShares,
      received: payouts[group]
    }
    expectation.add(group, 1, expectedPrize, extras)
  })
  if (!isCascade) return expectation
  const topGroup = Object.keys(payouts).sort()[0]
  if (topGroup == null || topGroup === 'Group 1') return expectation
  const cascadeOdd = Object.keys(odds)
    .filter(group => group < topGroup)
    .reduce((prob, group) => {
      return prob * Math.pow(1 - odds[group], stakes)
    }, 1)
  if (cascadeOdd < 1e-9) return expectation
  const cascadePrize = new BinomialInverseMoment(stakes, odds[topGroup], payouts[topGroup])
                         .transform(prizes['Group 1'].share)
                         .transform(payouts[topGroup])
  return expectation.add('Cascaded', cascadeOdd, cascadePrize)
}

function getPrizes (allocation, prizePool, snowballed) {
  const prizes = {}
  Object.keys(allocation).forEach(group => {
    prizes[group] = {...allocation[group]}
    if ('share' in prizes[group]) {
      prizes[group].share *= prizePool
      if (group in snowballed) prizes[group].share += snowballed[group]
    }
  })
  return prizes
}

exports.payoutFactory = payoutFactory
exports.getPayoutUnder496 = payoutFactory(STRUCTURE['496'], ALLOCATION['496'], 0.5)
exports.getPayoutUnder456 = payoutFactory(STRUCTURE['456'], ALLOCATION['456'], 0.25)
