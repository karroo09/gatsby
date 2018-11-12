const pathToObject = require(`../path-to-object`)

describe(`pathToObject util`, () => {
  it(`converts a dot-separated path to an object`, () => {
    const path = `foo.bar.baz`
    expect(pathToObject(path)).toEqual({ foo: { bar: { baz: true } } })
  })
})
