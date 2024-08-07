exports.promiseMap = function (iterable, mapper, options) {
  options = options || {}
  let concurrency = options.concurrency || Infinity

  let index = 0
  const results = []
  const iterator = iterable[Symbol.iterator]()
  const promises = []

  while (concurrency-- > 0) {
    const promise = wrappedMapper()
    if (promise) promises.push(promise)
    else break
  }

  return Promise.all(promises).then(() => results)

  function wrappedMapper () {
    const next = iterator.next()
    if (next.done) return null
    const i = index++
    const mapped = mapper(next.value, i)
    return Promise.resolve(mapped).then(resolved => {
      results[i] = resolved
      return wrappedMapper()
    })
  }
}

exports._pick = function (obj, keys) {
  const picked = {}
  keys.forEach(key => {
    picked[key] = obj[key]
  })
  return picked
}

exports._omit = function (obj, keys) {
  const omited = Object.assign({}, obj)
  keys.forEach(key => {
    delete omited[key]
  })
  return omited
}
