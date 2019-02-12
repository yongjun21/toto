const fetch = require('got')
const cheerio = require('cheerio')
const fs = require('fs')

const url = 'http://www.singaporepools.com.sg/outlets/Pages/lo_results.aspx?sppl=cz0mej1BJm89QSZjPUEmZD1B'

fetch(url)
  .then(res => cheerio.load(res.body))
  .then($ => {
    const outlets = []
    const $table = $('#tblOutletSearchResult')
    $table.find('td > ul > li').each(function (index) {
      const $outlet = $(this)
      const $name = $outlet.find('b')
      const name = $name.text().trim()
      $name.remove()
      const address = $outlet.text().trim().split(/\s{2,}/)
      const postal = address.pop()
      outlets.push({index: index + 1, name, address: address.join(' '), postal})
    })
    return outlets
  })
  .then(outlets => {
    fs.writeFileSync('data/outlets.json', JSON.stringify(outlets, null, 2))
  })
  .catch(console.error)
