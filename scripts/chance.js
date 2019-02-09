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
    this._events = []
  }

  add (event, probability, outcome, extras = {}) {
    const outcomeValue = (outcome instanceof Expectation)
                       ? outcome.value
                       : outcome
    const expected = probability * outcomeValue
    const row = {event, probability, outcome, expected}
    this._events.push(Object.assign(row, extras))
    return this
  }

  get value () {
    return this._events.reduce((sum, row) => sum + row.expected, 0)
  }

  get events () {
    return this._events
  }

  mapEvents (fn) {
    return this.events.map(row => {
      const mapped = Object.assign({}, row)
      if (mapped.outcome instanceof Expectation) {
        mapped.outcome = mapped.outcome.mapEvents(fn)
      } else {
        mapped.outcome = fn(mapped.outcome)
      }
      mapped.expected = mapped.probability * mapped.outcome
      return mapped
    })
  }

  [require('util').inspect.custom] () {
    return this.value
  }

  toJSON () {
    return this.events
  }
}

class BinomialInverseMoment extends Expectation {
  constructor (base, n, p, A = 1) {
    super()
    this.base = base
    this.shape = [n, p]
    this.offset = A
    this.baseValue = (base instanceof Expectation)
                   ? base.value
                   : base
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

  get value () {
    return this.probabilities.reduce((expected, probability, x) => {
      const outcomeValue = this.baseValue / (x + this.offset)
      return expected + probability * outcomeValue
    }, 0)
  }

  asEvents (delta, epsilon = 1e6) {
    const groups = []
    let lastGroup = null
    let lastIndex = -1
    const cumProbabilities = new Float64Array(this.probabilities.length)
    this.probabilities.forEach((probability, x) => {
      const outcomeValue = this.baseValue / (x + this.offset)
      const group = Math.round(outcomeValue / delta) * delta
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
    const events = cumProbabilities.reduce((rows, probability, x) => {
      if (probability < 1) return rows
      const outcomeValue = groups.pop()
      if (openRange) {
        openRange.push(x - 1 + this.offset)
        openRange = null
      }
      if (probability < 1 + epsilon) return rows
      probability -= 1

      const row = {
        shares: [x + this.offset],
        probability,
        outcome: outcomeValue
      }
      openRange = row.shares
      return rows.concat(row)
    }, [])
    if (openRange) openRange.push(this.shape[0] + this.offset)
    events.forEach(row => {
      const outcomeValue = row.shares[0] === row.shares[1]
                         ? this.baseValue / row.shares[0]
                         : row.outcome
      const scale = v => v * outcomeValue / this.baseValue
      row.outcome = (this.base instanceof Expectation)
                  ? this.base.mapEvents(scale)
                  : scale(this.base)
      row.expected = row.probability * outcomeValue
    })
    return events
  }

  get events () {
    return this.asEvents(100, 0.01)
      .map(row => {
        const event = row.shares[0] === row.shares[1]
                    ? row.shares[0] + ' winner(s)'
                    : `${row.shares[0]}-${row.shares[1]} winners`
        delete row.shares
        return Object.assign({event}, row)
      })
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
