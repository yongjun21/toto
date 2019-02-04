const fetch = require('got')
const fs = require('fs')
const {promiseMap} = require('./helpers')

const outlets = require('../data/outlets.json')

promiseMap(outlets, outlet => {
  outlet.postal = outlet.postal.slice(-6)
  const query = {
    searchVal: outlet.postal,
    returnGeom: 'Y',
    getAddrDetails: 'Y',
    pageNum: 1
  }
  return fetch('https://developers.onemap.sg/commonapi/search', {query})
    .then(res => {
      const match = JSON.parse(res.body).results[0]
      if (match) {
        outlet.latitude = +match.LATITUDE
        outlet.longitude = +match.LONGITUDE
      } else {
        console.log(outlet.postal)
      }
    })
}, {concurrency: 10}).then(() => {
  fs.writeFileSync('data/outlets.json', JSON.stringify(outlets, null, 2))
}).catch(console.error)
