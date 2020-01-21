const fetch = require('got')
const cheerio = require('cheerio')
const fs = require('fs')

const {promiseMap} = require('./helpers')

const scrapped = require('../data/scrapped.json')
const ordered = []
scrapped.forEach(draw => {
  ordered[draw.drawNo] = draw
})

const cipher = [
  ['w', 'x', 'y', 'z'],
  ['MD', 'MT', 'Mj', 'Mz', 'ND', 'NT', 'Nj', 'Nz', 'OD', 'OT'],
  ['A', 'E', 'I', 'M', 'Q', 'U', 'Y', 'c', 'g', 'k'],
  ['w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5']
]

scrapRange(1282, 3600)

function scrapRange (from, to) {
  const draws = []
  for (let drawNo = from; drawNo < to; drawNo++) {
    draws.push(drawNo)
  }
  promiseMap(draws, scrap, {concurrency: 10}).then(results => {
    const filtered = results.filter(row => row != null)
    console.log(filtered.length)
    fs.writeFileSync('data/scrapped.json', JSON.stringify(filtered, null, 2))
  })
}

function scrap (drawNo) {
  if (ordered[drawNo]) return ordered[drawNo]
  const url = 'http://www.singaporepools.com.sg/en/product/sr/Pages/toto_results.aspx'
  const query = {sppl: 'RHJhd051bWJlcj0' + encode(drawNo)}
  return fetch(url, {query})
    .then(res => cheerio.load(res.body))
    .then(verify(drawNo))
    .then(parse)
    .catch(console.error)
}

function verify (drawNo) {
  return $ => {
    if (drawNo !== +$('.drawNumber').text().trim().slice(-4)) {
      throw new Error('Mismatch: ' + drawNo)
    }
    return $
  }
}

function parse ($) {
  const parsed = {}
  parsed['drawNo'] = +$('.drawNumber').text().trim().slice(-4)
  parsed['drawDate'] = $('.drawDate').text().trim()
  parsed['winningNumbers'] = [
    $('td.win1').text().trim(),
    $('td.win2').text().trim(),
    $('td.win3').text().trim(),
    $('td.win4').text().trim(),
    $('td.win5').text().trim(),
    $('td.win6').text().trim()
  ].map(Number)
  parsed['additionalNumber'] = Number($('td.additional').text().trim())
  parsed['winningShares'] = []
  const $tableWinningShares = $('table.tableWinningShares tbody')
  $tableWinningShares.find('tr').slice(1).each(function () {
    const row = {}
    const $tds = $(this).find('td')
    row['prizeGroup'] = $tds.eq(0).text().trim()
    row['shareAmount'] = +$tds.eq(1).text().trim().replace(/^\$/, '').replace(/,/g, '')
    row['numberOfShares'] = +$tds.eq(2).text().trim().replace(/,/g, '')
    parsed['winningShares'].push(row)
  })
  parsed['winningOutlets'] = []
  $('.divWinningOutlets > p').each(function () {
    const row = {}
    const $p = $(this)
    const title = $p.text().trim()
    if (!title) return
    row['title'] = title
    if (/winning tickets/.test(row['title'])) {
      row['outlets'] = []
      $p.next('ul').children().each(function () {
        row['outlets'].push($(this).text().trim())
      })
    }
    parsed['winningOutlets'].push(row)
  })
  return parsed
}

function encode (drawNo) {
  return drawNo.toString().split('').map((digit, pos) => cipher[pos][digit]).join('')
}
