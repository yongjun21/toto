const googleapis = require('@st-graphics/backend/client/googleapis')

const data = require('../data/processed.json')

const outlets = {
  fields: ['index', 'name', 'address', 'postal', 'latitude', 'longitude'],
  data: require('../data/outlets.json')
}

const closed = {
  fields: ['index', 'name', 'address'],
  data: []
}

const historical = {
  fields: ['draw', 'year', 'hong_bao', 'group', 'share', 'outlet', 'quickpick', 'bet_type'],
  data: []
}

const hongbaos = []

const outletIndices = outlets.data.reduce((indices, row) => {
  indices[row.name + ' - ' + row.address] = row.index
  return indices
}, {})

const closedOutlets = new Set()
const closedIndices = {}

data.forEach(draw => {
  const base = {
    draw: draw.drawNo,
    year: +draw.drawDate.slice(-4),
    hong_bao: draw.isHongbao ? 1 : 0
  }

  draw.winningOutlets.forEach(row => {
    if (row.outlet === 'Singapore Pools Account Betting Service - -') row.outlet = 'ABS'
    else if (!(row.outlet in outletIndices)) closedOutlets.add(row.outlet)
    row.share = getShare(draw, row.group, row.bet_type === 'iTOTO - System 12')
    row.group = row.group.slice(-1)
    historical.data.push(Object.assign(row, base))
  })

  if (draw.isHongbao) {
    hongbaos.push([
      draw.drawNo,
      draw.drawDate,
      draw.winningNumbers[0],
      draw.winningNumbers[1],
      draw.winningNumbers[2],
      draw.winningNumbers[3],
      draw.winningNumbers[4],
      draw.winningNumbers[5],
      draw.additionalNumber,
      draw.winningShares['Group 1'].numberOfShares,
      draw.winningShares['Group 1'].shareAmount
    ])
  }
})

hongbaos.unshift([
  'draw', 'draw_date',
  'win_1', 'win_2', 'win_3', 'win_4', 'win_5', 'win_6', 'additional',
  'winners', 'share_amount'
])

closed.data = [...closedOutlets].sort().map((outlet, index) => {
  const [first, ...rest] = outlet.split(' - ')
  closedIndices[outlet] = 'X' + (index + 1)
  return {
    index: 'X' + (index + 1),
    name: first,
    address: rest.join(' - ')
  }
})

historical.data.forEach(row => {
  row.outlet = outletIndices[row.outlet] || closedIndices[row.outlet] || row.outlet
})

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'Outlets!A1:F',
  resource: outlets,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'Closed!A1:C',
  resource: closed,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'Historical!A1:H',
  resource: historical,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'HongBaos!A1:K',
  resource: {values: hongbaos},
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

function getShare (draw, group, iTOTO) {
  let share = draw.winningShares[group].shareAmount
  if (iTOTO) {
    share = Math.ceil(share / 2.8) * 0.1
  }
  return share
}
