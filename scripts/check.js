const data = require('../data/processed.json')

// const odds = getOdds(49, 6)
const odds = getOdds(45, 6)

const total = {
  prizePool: 0,
  allocated: 0,
  wins: {
    'Group 1': 0,
    'Group 2': 0,
    'Group 3': 0,
    'Group 4': 0,
    'Group 5': 0,
    'Group 6': 0
  },
  spent: 0
}
// total.wins['Group 7'] = 0

data.forEach(draw => {
  // if (draw.drawNo < 2995) return
  if (draw.drawNo < 1335) return
  if (draw.drawNo >= 2995) return
  total.prizePool += draw.prizePool
  total.allocated += draw.totalAllocated
  Object.keys(total.wins).forEach(group => {
    total.wins[group] += draw.winningShares[group].numberOfShares || 0
  })
})

Object.keys(total.wins).forEach(group => {
  total.spent += total.wins[group] * odds[group] / Object.keys(total.wins).length
})
total.spent *= 0.5

console.log(total)

function getOdds (numbers, pick) {
  const odds = {}
  const combinations = combi(numbers, pick)
  odds['Group 1'] = combinations
  let match = pick
  let group = 1
  while (--match > 0) {
    const unmatch = pick - match
    odds['Group ' + ++group] = combinations /
                                 combi(pick, match) /
                                   combi(numbers - pick - 1, unmatch - 1)
    odds['Group ' + ++group] = combinations /
                                 combi(pick, match) /
                                   combi(numbers - pick - 1, unmatch)
  }
  return odds
}

function combi (n, r) {
  let combinations = 1
  for (let k = 0; k < r; k++) {
    combinations *= (n - k) / (k + 1)
  }
  return combinations
}
