const fs = require('fs')
const {combi} = require('./chance')

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

class Expectation {
  add (event, probability, outcome, extra = {}) {
    const expected = probability * ((outcome instanceof Expectation) ? outcome.inspect() : outcome)
    this[event] = Object.assign({probability, outcome, expected}, extra)
    return this
  }

  inspect () {
    return Object.keys(this).reduce((sum, event) => {
      return sum + this[event].expected
    }, 0)
  }
}

const test = payoutFactory(STRUCTURE['496'], ALLOCATION['496'], 0.5)(10000000, {'Group 1': 5800000}, true, 'Ordinary')
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
    const tickets = Math.round(prizePool / conversion)
    const match = structure[betType].match
    const expectation = new Expectation()
    Object.keys(match).forEach(group => {
      expectation.add(
        group,
        match[group].probability,
        getExpectedOutcome(match[group].payouts, tickets, odds, prizes, isCascade)
      )
    })
    return expectation
  }
}

function getExpectedOutcome (payouts, tickets, odds, prizes, isCascade) {
  const expectation = new Expectation()
  Object.keys(payouts).forEach((group, i) => {
    let expectedShares = tickets * odds[group]
    let residueProb = 1
    for (let n = 0; n < payouts[group]; n++) {
      const probability = combi(tickets, n) * Math.pow(odds[group], n) * Math.pow(1 - odds[group], tickets - n)
      if (!Number.isFinite(probability)) continue
      expectedShares -= probability * n
      residueProb -= probability
    }
    expectedShares /= residueProb
    let expectedPrize = prizes[group].fixed || 0
    if ('share' in prizes[group]) {
      expectedPrize += prizes[group].share / expectedShares
    }
    expectation.add(group, payouts[group], expectedPrize, {shares: expectedShares})
  })
  if (!isCascade) return expectation
  const topGroup = Object.keys(payouts).sort()[0]
  if (topGroup == null || topGroup === 'Group 1') return expectation
  const cascadePrize = prizes['Group 1'].share / expectation[topGroup].shares
  const cascadeOdd = Object.keys(odds)
    .filter(group => group < topGroup)
    .reduce((prob, group) => {
      return prob * Math.pow(1 - odds[group], tickets)
    }, 1)
  return expectation.add('Cascaded', payouts[topGroup] * cascadeOdd, cascadePrize)
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
