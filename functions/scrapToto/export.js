const Papa = require('papaparse')

const shares = {
  fields: ['draw', 'group', 'shareAmount', 'numberOfShares', 'snowballed', 'cascaded'],
  data: []
}
const outlets = {
  fields: ['draw', 'group', 'outlet', 'quickpick', 'bet_type'],
  data: []
}

module.exports = function (data) {
  const draws = data.filter(draw => draw.drawNo >= 1335).map(draw => {
    Object.keys(draw.winningShares).forEach(group => {
      const row = Object.assign({
        draw: draw.drawNo,
        group
      }, draw.winningShares[group])
      shares.data.push(row)
    })

    draw.winningOutlets.forEach(row => {
      outlets.data.push(Object.assign({
        draw: draw.drawNo
      }, row))
    })

    return [
      draw.drawNo,
      draw.drawDate,
      draw.week,
      draw.dayOfWeek,
      draw.isHongbao ? 1 : 0,
      draw.winningNumbers[0],
      draw.winningNumbers[1],
      draw.winningNumbers[2],
      draw.winningNumbers[3],
      draw.winningNumbers[4],
      draw.winningNumbers[5],
      draw.additionalNumber,
      draw.totalDistributed,
      draw.totalAllocated,
      draw.prizePool,
      draw.winningShares['Group 1'].snowballed || 0,
      draw.winningShares['Group 2'].snowballed || 0,
      draw.consecutive,
      draw.discrepency
    ]
  })

  draws.unshift([
    'draw_no', 'draw_date', 'week', 'day_of_week', 'is_hong_bao',
    'win_1', 'win_2', 'win_3', 'win_4', 'win_5', 'win_6', 'additional',
    'total_distributed', 'total_allocated', 'prize_pool',
    'snowballed_1', 'snowballed_2', 'consecutive',
    'discrepency'
  ])

  return [Papa.unparse(draws), Papa.unparse(shares), Papa.unparse(outlets)]
}
