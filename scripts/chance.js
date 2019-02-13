const {_omit} = require('./helpers')

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
    payouts['Group ' + group] = getPayout(group, available, drawed, picked)
  }
  return payouts
}

function getPayout (group, available, drawed, picked) {
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
    this.events.list = list
  }

  add (event, probability, outcome, extras = {}) {
    const outcomeValue = (outcome instanceof Expectation)
                       ? outcome.value
                       : outcome
    const expected = probability * outcomeValue
    const row = {event, probability, outcome, expected}
    this.events.push(Object.assign(row, extras))
    return this
  }

  get value () {
    return this.events.reduce((sum, row) => sum + row.expected, 0)
  }

  transform (fn) {
    const expectation = new Expectation()
    this.events.forEach(row => {
      const extras = _omit(row, ['event', 'probability', 'outcome', 'expected'])
      expectation.add(
        row.event,
        row.probability,
        row.outcome instanceof Expectation ? row.outcome.transform(fn) : fn(row.outcome),
        extras
      )
    })
    return expectation
  }

  [require('util').inspect.custom] () {
    return this.value
  }

  toJSON () {
    return this.events.list()
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
    this.events = this.asEvents(Math.floor(base / (Math.log2(n) + 1)))
  }

  transform (fn) {
    return new BinomialInverseMoment(
      this.base instanceof Expectation ? this.base.transform(fn) : fn(this.base),
      this.shape[0],
      this.shape[1],
      this.offset
    )
  }

  asEvents (outcomeWidth, probabilityWidth = 0.01) {
    let lastRow = null
    const firstPass = this.probabilities.reduce((rows, probability, x) => {
      const outcomeValue = this.baseValue / (x + this.offset)
      if (lastRow && (lastRow.probability + probability < probabilityWidth) > 0) {
        lastRow.probability += probability
        lastRow.expected += probability * outcomeValue
        return rows
      }
      if (lastRow) lastRow.event.push(x + this.offset - 1)
      lastRow = {
        event: [x + this.offset],
        probability,
        outcome: null,
        expected: probability * outcomeValue
      }
      return rows.concat(lastRow)
    }, [])
    const secondPass = firstPass.reduce((grouped, row) => {
      const effectiveOutcome = row.expected / row.probability
      const group = Math.floor(effectiveOutcome / outcomeWidth)
      if (group in grouped) {
        grouped[group].event[1] = row.event[1]
        grouped[group].probability += row.probability
        grouped[group].expected += row.expected
      } else {
        grouped[group] = row
      }
      return grouped
    }, {})
    const events = Object.values(secondPass).sort((a, b) => a.event[0] - b.event[0])
    events.forEach(row => {
      if (events.length === 1) {
        const expectedShare = this.shape[0] * this.shape[1] + this.offset
        row.event = `~${Math.round(expectedShare)} shares`
        row.probability = 1
      } else {
        row.event = row.event[0] === row.event[1] ? `${row.event[0]} shares`
                  : row.event[1] == null ? `>${row.event[0] - 1} shares`
                  : `${row.event[0]}-${row.event[1]} shares`
      }
      const effectiveOutcome = row.expected / row.probability
      row.outcome = this.base instanceof Expectation
                  ? this.base.transform(outcome => outcome / this.baseValue * effectiveOutcome)
                  : effectiveOutcome
    })
    events.list = list
    return events
  }
}
BinomialInverseMoment.memo = {}

function list () {
  const concurrents = this
    .filter(row => row.probability >= 1)
    .map(row => {
      let events
      if (row.outcome instanceof Expectation) {
        events = row.outcome.events.list().map(r => ({
          event: `[${row.event}](${r.event})`,
          probability: r.probability,
          outcome: r.outcome
        }))
      } else {
        events = [{
          event: row.probability > 1 ? `[${row.event}]` : row.event,
          probability: 1,
          outcome: row.outcome
        }]
      }
      events.forEach(item => {
        if (row.probability > 1) {
          item.event = `${row.probability}${item.event}`
          item.outcome *= row.probability
        }
      })
      return events
    })

  if (concurrents.length === this.length) {
    return getExpandedForm(concurrents, reduce)
  }

  const mutuallyExclusive = this
    .filter(event => event.probability < 1)
    .reduce((events, row) => {
      if (row.outcome instanceof Expectation) {
        row.outcome.events.list().forEach(r => {
          events.push({
            event: `${row.event} * ${r.event.includes(' + ') ? `(${r.event})` : r.event}`,
            probability: row.probability * r.probability,
            outcome: r.outcome
          })
        })
      } else {
        events.push(row)
      }
      return events
    }, [])

  const residualProbability = 1 - mutuallyExclusive
    .reduce((sum, item) => sum + item.probability, 0)
  if (concurrents.length > 0 && residualProbability > 0.000001) {
    mutuallyExclusive.push({
      event: null,
      probability: residualProbability,
      outcome: 0
    })
  }

  return getExpandedForm([...concurrents, mutuallyExclusive], reduce)

  function reduce (a, b) {
    return {
      event: b.event == null ? `${a.event}` : `${a.event} + ${b.event}`,
      probability: a.probability * b.probability,
      outcome: a.outcome + b.outcome
    }
  }
}

function getExpandedForm (sets, reduce) {
  let expandedForm = sets.pop() || []
  while (sets.length > 0) {
    const factor = sets.pop()
    expandedForm = factor.reduce((arr, a) => {
      return arr.concat(expandedForm.map(b => reduce(a, b)))
    }, [])
  }
  return expandedForm
}

function * poissonGenerator (rate) {
  let eventTime = Math.log(Math.random()) / (-rate)
  while (true) {
    let eventCount = 0
    while (eventTime < 1) {
      eventCount++
      eventTime += Math.log(Math.random()) / (-rate)
    }
    eventTime -= 1
    yield eventCount
  }
}

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
exports.poissonGenerator = poissonGenerator
