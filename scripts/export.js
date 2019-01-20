const googleapis = require('@st-graphics/backend/client/googleapis')
const Papa = require('papaparse')
const fs = require('fs')

const data = require('../data/processed.json')

const shares = {
  fields: ['draw', 'group', 'shareAmount', 'numberOfShares', 'snowballed', 'cascaded', 'allocated'],
  data: []
}
const outlets = {
  fields: ['draw', 'group', 'outlet', 'ticket'],
  data: []
}

const draws = data.map(draw => {
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
    draw.isCascade ? 1 : 0,
    draw.winningNumbers[0],
    draw.winningNumbers[1],
    draw.winningNumbers[2],
    draw.winningNumbers[3],
    draw.winningNumbers[4],
    draw.winningNumbers[5],
    draw.additionalNumber,
    draw.totalAllocated,
    draw.prizePool
  ]
})

draws.unshift([
  'draw_no', 'draw_date', 'week', 'day_of_week',
  'is_hong_bao', 'is_cascade',
  'win_1', 'win_2', 'win_3', 'win_4', 'win_5', 'win_6', 'additional',
  'total_allocated', 'prize_pool'
])

fs.writeFileSync('data/processed/draws.csv', Papa.unparse(draws))
fs.writeFileSync('data/processed/shares.csv', Papa.unparse(shares))
fs.writeFileSync('data/processed/outlets.csv', Papa.unparse(outlets))

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '19mEjQL-oHPpdruFbMYGRt685aiA9oZGWRZIyiu0vm7k',
  range: 'Draws!A1:O',
  resource: {values: draws},
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '19mEjQL-oHPpdruFbMYGRt685aiA9oZGWRZIyiu0vm7k',
  range: 'Shares!A1:G',
  resource: shares,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '19mEjQL-oHPpdruFbMYGRt685aiA9oZGWRZIyiu0vm7k',
  range: 'Outlets!A1:D',
  resource: outlets,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)
