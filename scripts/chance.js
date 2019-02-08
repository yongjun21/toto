function getOdds (available, drawed, picked = drawed) {
  const odds = {}
  const combinations = combi(available, picked)
  for (let group = 0; group < drawed * 2; group++) {
    const match = drawed - Math.floor(group / 2)
    const nomatch = group % 2 ? picked - match : picked - match - 1
    odds['Group ' + group] = combinations /
                                 combi(drawed, match) /
                                   combi(available - drawed - 1, nomatch)
  }
  return odds
}

function getPayouts (available, drawed, picked = drawed) {
  const payouts = {}
  for (let group = 0; group < drawed * 2; group++) {
    payouts['Group ' + group] = getGroupPayout(group, available, drawed, picked)
  }
  return payouts
}

function getGroupPayout (group, available, drawed, picked) {
  const payout = {}
  const match = drawed - Math.floor(group / 2)
  const nomatch = group % 2 ? picked - match : picked - match - 1
  for (let group2 = group; group2 < drawed * 2; group2++) {
    if (group % 2 === 1 && group2 % 2 === 0) continue
    const match2 = drawed - Math.floor(group2 / 2)
    const nomatch2 = group2 % 2 ? drawed - match2 : drawed - match2 - 1
    const combinations = combi(match, match2) * combi(nomatch, nomatch2)
    if (combinations > 0) payout['Group ' + group2] = combinations
  }
  return payout
}

class Expectation {
  constructor () {
    this.events = []
  }

  add (event, probability, outcome, extras = {}) {
    const expected = probability * ((outcome instanceof Expectation) ? outcome.value() : outcome)
    const row = {event, probability, outcome, expected}
    this.events.push(Object.assign(row, extras))
    return this
  }

  value () {
    return this.events.reduce((sum, row) => sum + row.expected, 0)
  }

  [require('util').inspect.custom] () {
    return this.value()
  }

  toJSON () {
    return this.events
  }
}

class BinomialInverseMoment extends Expectation {
  constructor (n, p, A = 1) {
    super()
    this.shape = [n, p]
    this.offset = A
    this.transformations = []
    if (this.shape in BinomialInverseMoment.memo) {
      this.probabilities = BinomialInverseMoment.memo[this.shape]
    } else {
      this.probabilities = new Float64Array(n + 1)
      const oddRatio = p / (1 - p)
      let probability = Math.pow(1 - p, n)
      this.probabilities[0] = probability
      for (let x = 1; x <= n; x++) {
        probability *= oddRatio
        probability *= (n + 1 - x) / x
        this.probabilities[x] = probability
      }
      BinomialInverseMoment.memo[this.shape] = this.probabilities
    }
  }

  transform (scale = 1, offset = 0) {
    this.transformations.push(value => scale * value + offset)
    return this
  }

  simplify (groupBy, epsilon = 1e6) {
    const groups = []
    let lastGroup = null
    let lastIndex = -1
    const cumProbabilities = new Float64Array(this.probabilities.length)
    this.probabilities.forEach((probability, x) => {
      const outcome = this.transformations
        .reduce((outcome, transform) => transform(outcome), 1 / (x + this.offset))
      const group = groupBy(outcome)
      if (group !== lastGroup) {
        groups.push(group)
        cumProbabilities[x] = 1
        lastGroup = group
        lastIndex = x
      }
      cumProbabilities[lastIndex] += probability
    })
    groups.reverse()
    let openRange = null
    return cumProbabilities.reduce((events, probability, x) => {
      if (probability < 1) return events
      const outcome = groups.pop()
      if (openRange) {
        openRange.push(x - 1 + this.offset)
        openRange = null
      }
      if (probability < 1 + epsilon) return events
      probability -= 1
      const row = {
        probability,
        outcome,
        expected: probability * outcome,
        between: [x + this.offset]
      }
      openRange = row.between
      return events.concat(row)
    }, [])
  }

  value () {
    return this.probabilities.reduce((expected, probability, x) => {
      const outcome = this.transformations
        .reduce((outcome, transform) => transform(outcome), 1 / (x + this.offset))
      return expected + probability * outcome
    }, 0)
  }

  asEvents () {
    return this.simplify(value => Math.round(value / 100) * 100, 0.01)
      .map(row => {
        const event = row.between[0] === row.between[1]
                    ? row.between[0] + ' winner(s)'
                    : `${row.between[0]}-${row.between[1]} winners`
        delete row.between
        return Object.assign({event}, row)
      })
  }

  toJSON () {
    return this.asEvents()
  }
}
BinomialInverseMoment.memo = {}

function combi (n, r) {
  if (n < 0 || r < 0 || n - r < 0) return 0
  let combinations = 1
  for (let k = 0; k < r; k++) {
    combinations *= (n - k) / (k + 1)
  }
  return Math.round(combinations)
}

exports.getOdds = getOdds
exports.getPayouts = getPayouts
exports.combi = combi
exports.Expectation = Expectation
exports.BinomialInverseMoment = BinomialInverseMoment
