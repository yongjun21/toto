const googleapis = require('@st-graphics/googleapis')
const Papa = require('papaparse')
const fs = require('fs')

const data = require('../data/processed.json')
const structure = require('../data/structure.json')

const shares = {
  fields: ['draw', 'group', 'shareAmount', 'numberOfShares', 'snowballed', 'cascaded'],
  data: []
}
const outlets = {
  fields: ['draw', 'group', 'outlet', 'quickpick', 'bet_type'],
  data: []
}

const draws = data.filter(draw => draw.drawNo >= 1335).map(draw => {
  Object.keys(draw.winningShares).forEach(group => {
    const row = Object.assign({draw: draw.drawNo, group}, draw.winningShares[group])
    shares.data.push(row)
  })

  draw.winningOutlets.forEach(row => {
    outlets.data.push(Object.assign({draw: draw.drawNo}, row))
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

const oddsNpayouts = {
  fields: ['format', 'bet_type', 'stakes', 'match', 'probability', 'odds', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6', 'Group 7'],
  data: []
}

Object.keys(structure).forEach(format => {
  Object.keys(structure[format]).forEach(betType => {
    const matches = structure[format][betType].match
    Object.keys(matches).forEach(match => {
      const row = {
        format,
        bet_type: betType,
        stakes: structure[format][betType].stakes,
        match,
        probability: matches[match].probability,
        odds: matches[match].odds
      }
      oddsNpayouts.data.push(Object.assign(row, matches[match].payouts))
    })
  })
})

fs.writeFileSync('data/processed/draws.csv', Papa.unparse(draws))
fs.writeFileSync('data/processed/shares.csv', Papa.unparse(shares))
fs.writeFileSync('data/processed/outlets.csv', Papa.unparse(outlets))
fs.writeFileSync('data/processed/structure.csv', Papa.unparse(oddsNpayouts))

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '11s_2jAp3jXNnQ47bDajFaHxsK6EXlj8FSTxE140_wog',
  range: 'Draws!A1:S',
  resource: {values: draws},
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '11s_2jAp3jXNnQ47bDajFaHxsK6EXlj8FSTxE140_wog',
  range: 'Shares!A1:G',
  resource: shares,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '11s_2jAp3jXNnQ47bDajFaHxsK6EXlj8FSTxE140_wog',
  range: 'Outlets!A1:E',
  resource: outlets,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

/*
googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '11s_2jAp3jXNnQ47bDajFaHxsK6EXlj8FSTxE140_wog',
  range: 'Odds & Payouts!A1:M',
  resource: oddsNpayouts,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)
*/
