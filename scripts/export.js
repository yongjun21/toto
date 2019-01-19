const data = require('../data/processed.json')
const googleapis = require('@st-graphics/backend/client/googleapis')

const shares = []
const outlets = []

data.forEach(draw => {
  Object.keys(draw.winningShares).forEach(group => {
    const row = Object.assign({draw: draw.drawNo, group}, draw.winningShares[group])
    shares.push(row)
  })

  draw.winningOutlets.forEach(row => {
    outlets.push(Object.assign({draw: draw.drawNo}, row))
  })
})

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '19mEjQL-oHPpdruFbMYGRt685aiA9oZGWRZIyiu0vm7k',
  range: 'Shares!A1:G',
  resource: {
    fields: ['draw', 'group', 'shareAmount', 'numberOfShares', 'snowballed', 'cascaded', 'allocated'],
    data: shares
  },
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)

googleapis.sheets.spreadsheets.values.upload({
  spreadsheetId: '19mEjQL-oHPpdruFbMYGRt685aiA9oZGWRZIyiu0vm7k',
  range: 'Outlets!A1:D',
  resource: {
    fields: ['draw', 'group', 'outlet', 'ticket'],
    data: outlets
  },
  valueInputOption: 'USER_ENTERED'
}).then(res => console.log(res.data)).catch(console.error)
