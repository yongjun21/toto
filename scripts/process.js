const fs = require('fs')

const data = require('../data/scrapped.json')
const hongbao = require('../data/hongbao.json')

const patterns = [
  /Group (1|2) winning tickets sold at:/,
  /Group (1|2) has no winner, and the prize amount of \$([0-9,]+) will be snowballed to the next draw\./,
  /Group 1 has no winner, and the prize amount of \$([0-9,]+) has been cascaded to Group (\d)\./
]

data.forEach(draw => {
  if (hongbao.includes(draw.drawNo)) draw.isHongbao = true
  const winningShares = {}
  const winningOutlets = {}
  draw.winningShares.forEach(row => {
    winningShares[row.prizeGroup] = {
      shareAmount: row.shareAmount,
      numberOfShares: row.numberOfShares
    }
  })
  draw.winningOutlets.forEach(row => {
    let match
    match = row.title.match(patterns[0])
    if (match) {
      const group = 'Group ' + match[1]
      winningOutlets[group] = row.outlets
      return
    }
    match = row.title.match(patterns[1])
    if (match) {
      const group = 'Group ' + match[1]
      const amount = +match[2].replace(/,/g, '')
      if (winningShares[group].shareAmount == null) {
        winningShares[group].shareAmount = amount
        winningShares[group].numberOfShares = 0
      }
      return
    }
    match = row.title.match(patterns[2])
    if (match) {
      const group = 'Group ' + match[2]
      const amount = +match[1].replace(/,/g, '')
      winningShares['Group 1'].shareAmount = amount
      winningShares['Group 1'].numberOfShares = 0
      winningShares[group].cascaded = amount
      draw.isCascade = true
    }
  })
  draw.winningShares = winningShares
  draw.winningOutlets = winningOutlets
})

const ordered = []
data.forEach(draw => {
  ordered[draw.drawNo] = draw
})

correct2586(ordered[2586])

ordered.forEach((draw, i) => {
  if (i === ordered.length - 1) return
  Object.keys(draw.winningShares).forEach(group => {
    if (draw.winningShares[group].numberOfShares === 0) {
      if (draw.isCascade && group === 'Group 1') return
      const nextDraw = ordered[i + 1]
      nextDraw.winningShares[group].snowballed = draw.winningShares[group].shareAmount
    }
  })
})

data.shift()

data.forEach(draw => {
  draw.totalAllocated = 0
  Object.keys(draw.winningShares).forEach(group => {
    const winningShares = draw.winningShares[group]
    const totalAmount = (winningShares.numberOfShares || 1) * winningShares.shareAmount
    winningShares.allocated = totalAmount - (winningShares.snowballed || 0) - (winningShares.cascaded || 0)
    draw.totalAllocated += winningShares.allocated
  })
  if (draw.drawNo < 1335) return
  let prizePool = draw.winningShares['Group 2'].allocated +
                  draw.winningShares['Group 3'].allocated +
                  draw.winningShares['Group 4'].allocated
  if (draw.drawNo < 2995) {
    if (draw.isHongbao) {
      draw.prizePool = Math.round(prizePool / 0.39)
    } else {
      prizePool += draw.winningShares['Group 1'].allocated
      draw.prizePool = Math.round(prizePool / 0.7)
    }
  } else {
    if (draw.isHongbao) {
      draw.prizePool = Math.round(prizePool / 0.165)
    } else {
      prizePool += draw.winningShares['Group 1'].allocated
      draw.prizePool = Math.round(prizePool / 0.545)
    }
  }
})

fs.writeFileSync('data/processed.json', JSON.stringify(data, null, 2))

function correct2586 (draw) {
  const winningShares = draw.winningShares
  winningShares['Group 2'] = winningShares['Group 3']
  winningShares['Group 3'] = winningShares['Group 1']
  const average = (winningShares['Group 2'].shareAmount * winningShares['Group 2'].numberOfShares +
                   winningShares['Group 3'].shareAmount * winningShares['Group 3'].numberOfShares +
                   winningShares['Group 4'].shareAmount * winningShares['Group 4'].numberOfShares) / 3
  winningShares['Group 1'] = {
    shareAmount: Math.round(average / 13 * 31),
    numberOfShares: 0
  }
}
