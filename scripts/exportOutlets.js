const googleapis = require('@st-graphics/backend/client/googleapis')

const data = require('../data/processed.json')

const outlets = {
  fields: ['name', 'address', 'postal', 'latitude', 'longitude'],
  data: require('../data/outlets.json')
}
const historical = {
  fields: ['draw', 'year', 'hong_bao', 'group', 'share', 'outlet', 'quickpick', 'bet_type'],
  data: []
}

const outletsList = outlets.data.map(row => row.name + ' - ' + row.address)

data.forEach(draw => {
  const base = {
    draw: draw.drawNo,
    year: +draw.drawDate.slice(-4),
    hong_bao: draw.isHongbao ? 1 : 0
  }

  draw.winningOutlets.forEach(row => {
    if (!outletsList.includes(row.outlet)) return
    const share = getShare(draw, row.group, row.bet_type === 'iTOTO - System 12')
    historical.data.push(Object.assign(row, base, {share}))
  })
})

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'Outlets!A1:E',
  resource: outlets,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '1rkLhyuS7u9nV-Cq8XpFkAnvShpKFOwPJBDGTmsGrf9E',
  range: 'Historical!A1:H',
  resource: historical,
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

function getShare (draw, group, iTOTO) {
  let share = draw.winningShares[group].shareAmount
  if (iTOTO) {
    share = Math.ceil(share / 2.8) * 0.1
  }
  return share
}