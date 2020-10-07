const axios = require('axios')

const scrap = require('./scrap')
const process = require('./process')
const exportCSV = require('./export')

const AWS = require('aws-sdk')
const gzip = require('util').promisify(require('zlib').gzip)
const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'ap-southeast-1' })

const ENDPOINT = 'https://assets.yongjun.sg/toto/'

exports.handler = async function () {
  const data = await axios.get(ENDPOINT + 'data.json').then(res => res.data)

  let lastDraw = data[data.length - 1]

  while (true) {
    try {
      const scrapped = await scrap(lastDraw.drawNo + 1)
      const processed = process(scrapped, lastDraw)
      data.push(processed)
      lastDraw = processed
    } catch (err) {
      if (err.message === '404') break
      else throw err
    }
  }

  const [drawsCSV, sharesCSV, outletsCSV] = exportCSV(data)

  return Promise.all([
    uploadS3(JSON.stringify(data), 'toto/data.json'),
    uploadS3(drawsCSV, 'toto/draws.csv'),
    uploadS3(sharesCSV, 'toto/shares.csv'),
    uploadS3(outletsCSV, 'toto/outlets.csv')
  ])
}

function uploadS3 (data, filename) {
  const contentType =
      filename.endsWith('.json') ? 'application/json'
        : filename.endsWith('.csv') ? 'text/csv'
          : 'application/octet-stream'
  return gzip(data).then(buffer => {
    const params = {
      Body: buffer,
      Bucket: 'assets.yongjun.sg',
      Key: filename,
      ContentType: contentType,
      ContentEncoding: 'gzip',
      ACL: 'public-read',
      CacheControl: 'public, max-age=0, must-revalidate'
    }
    return s3.putObject(params).promise()
  })
}
