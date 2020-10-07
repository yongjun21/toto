/* eslint-disable dot-notation */
const axios = require('axios')
const cheerio = require('cheerio')

const cipher = [
  ['w', 'x', 'y', 'z'],
  ['MD', 'MT', 'Mj', 'Mz', 'ND', 'NT', 'Nj', 'Nz', 'OD', 'OT'],
  ['A', 'E', 'I', 'M', 'Q', 'U', 'Y', 'c', 'g', 'k'],
  ['w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5']
]

module.exports = function scrap (drawNo) {
  const url = 'http://www.singaporepools.com.sg/en/product/sr/Pages/toto_results.aspx'
  const params = { sppl: 'RHJhd051bWJlcj0' + encode(drawNo) }
  return axios.get(url, { params })
    .then(res => cheerio.load(res.data))
    .then(verify.bind(null, drawNo))
    .then(parse)
}

function verify (drawNo, $) {
  if (drawNo !== +$('.drawNumber').text().trim().slice(-4)) {
    throw new Error('404')
  }
  return $
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
