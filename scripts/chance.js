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
