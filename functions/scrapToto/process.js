const _getISOWeek = require('date-fns/getISOWeek')
const _setISODay = require('date-fns/setISODay')

const patterns = [
  /Group (1|2) winning tickets sold at:/,
  /Group (1|2) has no winner, and the prize amount of \$([0-9,]+) will be snowballed to the next draw\./,
  /Group 1 has no winner, and the prize amount of \$([0-9,]+) has been cascaded to Group (\d)\./
]

const isHongbao = process.env.HONG_BAO > ''

module.exports = function (draw, prevDraw) {
  const drawDate = new Date(draw.drawDate)
  draw.dayOfWeek = drawDate.getDay() || 7
  draw.week = _setISODay(drawDate, 4).getFullYear() + 'W' + _getISOWeek(drawDate).toString().padStart(2, '0')
  draw.isHongbao = isHongbao
  const winningShares = {}
  draw.winningShares.forEach(row => {
    winningShares[row.prizeGroup] = {
      shareAmount: row.shareAmount,
      numberOfShares: row.numberOfShares
    }
  })
  draw.winningShares = winningShares

  const winningOutlets = []
  draw.winningOutlets.forEach(row => {
    let match
    match = row.title.match(patterns[0])
    if (match) {
      const group = 'Group ' + match[1]
      row.outlets.forEach(outlet => {
        const match = outlet.match(/\( (\d+) (QuickPick )?(.+) \)$/)
        if (match) {
          const times = +match[1]
          const quickpick = match[2] ? 1 : 0
          const ticket = match[3]
          outlet = outlet.slice(0, match.index).trim().replace(/\s+/g, ' ')
          for (let n = 0; n < times; n++) {
            winningOutlets.push({ group, outlet, quickpick, bet_type: ticket })
          }
        } else if (outlet.startsWith('iTOTO - System 12')) {
          const ticket = 'iTOTO - System 12'
          const outlets = outlet.split('\n')
            .map(str => str.trim())
            .filter((str, i) => i > 0 && str.length > 0)
            .map(str => str.replace(/^\d+\.\s+/, '').replace(/\s+/g, ' '))
          outlets.forEach(outlet => {
            winningOutlets.push({ group, outlet, quickpick: 1, bet_type: ticket })
          })
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
      if (isNaN(winningShares[group].shareAmount)) {
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
    }
  })
  draw.winningOutlets = winningOutlets

  Object.keys(prevDraw.winningShares).forEach(group => {
    if (prevDraw.winningShares[group].numberOfShares === 0) {
      if (group === 'Group 1' && prevDraw.winningShares['Group 2'].cascaded) return
      draw.winningShares[group].snowballed = prevDraw.winningShares[group].shareAmount
    }
  })

  draw.consecutive = draw.winningShares['Group 1'].snowballed ? prevDraw.consecutive + 1 : 0
  draw.totalDistributed = 0
  draw.totalAllocated = 0
  Object.keys(draw.winningShares).forEach(group => {
    const winningShares = draw.winningShares[group]
    const totalAmount = (winningShares.numberOfShares || 1) * winningShares.shareAmount
    winningShares.allocated = totalAmount - (winningShares.snowballed || 0) - (winningShares.cascaded || 0)
    draw.totalDistributed += winningShares.numberOfShares * winningShares.shareAmount
    draw.totalAllocated += winningShares.allocated
  })
  let prizePool = draw.winningShares['Group 2'].allocated +
                  draw.winningShares['Group 3'].allocated +
                  draw.winningShares['Group 4'].allocated
  draw.discrepency = getDiscrepency(draw)
  const hasDiscrepency = Math.abs(draw.discrepency) > 10000
  if (draw.drawNo < 2995) {
    if (draw.isHongbao || draw.winningShares['Group 1'].allocated === 500000 || hasDiscrepency) {
      draw.prizePool = Math.round(prizePool / 0.39)
    } else {
      prizePool += draw.winningShares['Group 1'].allocated
      draw.prizePool = Math.round(prizePool / 0.72)
    }
  } else {
    if (draw.isHongbao || draw.winningShares['Group 1'].allocated === 1000000 || hasDiscrepency) {
      draw.prizePool = Math.round(prizePool / 0.165)
    } else {
      prizePool += draw.winningShares['Group 1'].allocated
      draw.prizePool = Math.round(prizePool / 0.545)
    }
  }

  return draw
}

function getDiscrepency (draw) {
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
