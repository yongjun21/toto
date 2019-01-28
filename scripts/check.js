const structure = require('../data/structure.json')

exports.estimatePool = function (draw) {
  if (draw.drawNo < 1335) return null
  if (draw.drawNo < 2995) {
    return Math.round(getTotalWinners(draw) / structure['456']['Ordinary'].win_something * 0.5 * 0.5)
  } else {
    return Math.round(getTotalWinners(draw) / structure['496']['Ordinary'].win_something * 0.5)
  }
}

exports.getDiscrepency = function (draw) {
  if (draw.drawNo < 1335) return null
  const group1 = draw.winningShares['Group 1'].allocated
  const group234 = draw.winningShares['Group 2'].allocated +
                   draw.winningShares['Group 3'].allocated +
                   draw.winningShares['Group 4'].allocated
  if (draw.drawNo < 2995) {
    return Math.round(group1 / 0.33 - group234 / 0.39)
  } else {
    return Math.round(group1 / 0.38 - group234 / 0.165)
  }
}

exports.wrongPrize = function (draw) {
  if (draw.drawNo < 2995) {
    if (draw.winningShares['Group 6'].shareAmount !== 20) throw new Error()
  } else {
    if (draw.winningShares['Group 7'].shareAmount !== 10) throw new Error()
  }
}

function getTotalWinners (draw) {
  let total = 0
  Object.keys(draw.winningShares).forEach(group => {
    total += draw.winningShares[group].numberOfShares
  })
  return total
}
