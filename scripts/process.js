const fs = require('fs')
const _getISOWeek = require('date-fns/get_iso_week')
const _setISODay = require('date-fns/set_iso_day')

const data = require('../data/scrapped.json')
const hongbao = require('../data/hongbao.json')

const ordered = []
data.forEach(draw => {
  ordered[draw.drawNo] = draw
})

const patterns = [
  /Group (1|2) winning tickets sold at:/,
  /Group (1|2) has no winner, and the prize amount of \$([0-9,]+) will be snowballed to the next draw\./,
  /Group 1 has no winner, and the prize amount of \$([0-9,]+) has been cascaded to Group (\d)\./
]

data.forEach(draw => {
  const drawDate = new Date(draw.drawDate)
  draw.dayOfWeek = drawDate.getDay() || 7
  draw.week = _setISODay(drawDate, 4).getFullYear() + 'W' + _getISOWeek(drawDate).toString().padStart(2, '0')
  if (hongbao.includes(draw.drawNo)) draw.isHongbao = true
  const winningShares = {}
  draw.winningShares.forEach(row => {
    winningShares[row.prizeGroup] = {
      shareAmount: row.shareAmount,
      numberOfShares: row.numberOfShares
    }
  })
  draw.winningShares = winningShares
})

correct2586(ordered[2586])

data.forEach(draw => {
  const winningShares = draw.winningShares
  const winningOutlets = []
  draw.winningOutlets.forEach(row => {
    let match
    match = row.title.match(patterns[0])
    if (match) {
      const group = 'Group ' + match[1]
      row.outlets.forEach(outlet => {
        const match = outlet.match(/\( (\d+) (.+) \)$/)
        if (match) {
          const times = +match[1]
          const ticket = match[2]
          outlet = outlet.slice(0, match.index).trim()
          for (let n = 0; n < times; n++) {
            winningOutlets.push({group, outlet, ticket})
          }
        } else if (outlet.startsWith('iTOTO - System 12')) {
          const ticket = 'iTOTO - System 12'
          outlet = null
          winningOutlets.push({group, outlet, ticket})
        } else {
          console.log(outlet)
        }
      })
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
  draw.winningOutlets = winningOutlets
})

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
  draw.consecutive = getConsecutive(draw.drawNo)
  delete draw.isCascade
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
  winningShares['Group 1'] = {
    shareAmount: null,
    numberOfShares: null
  }
}

function getConsecutive (drawNo) {
  let consecutive = 0
  for (let n = drawNo; n > drawNo - 3; n--) {
    if (ordered[n] && ordered[n].winningShares['Group 1'].snowballed) consecutive++
    else break
  }
  return consecutive
}
