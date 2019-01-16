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
    if (mapped instanceof Promise) {
      return mapped.then(resolved => {
        results[i] = resolved
      }).then(wrappedMapper)
    } else {
      results[i] = mapped
      return wrappedMapper()
    }
  }
}
