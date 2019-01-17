const fetch = require('got')
const cheerio = require('cheerio')
const fs = require('fs')

const url = 'http://www.singaporepools.com.sg/DataFileArchive/Lottery/Output/toto_result_hongbao_draw_list_en.html'

fetch(url)
  .then(res => cheerio.load(res.body))
  .then(parse)
  .then(result => {
    fs.writeFileSync('data/hongbao.json', JSON.stringify(result))
  })
  .catch(console.error)

function parse ($) {
  const result = []
  $('.selectDrawList > option').each(function () {
    const $option = $(this)
    result.push(+$option.attr('value'))
  })
  return result
}
