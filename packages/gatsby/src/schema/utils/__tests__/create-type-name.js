const createTypeName = require(`../create-type-name`)

describe(`createTypeName util`, () => {
  it(`creates a valid type name from a selector`, () => {
    const selector = `foobar`
    const typeName = createTypeName(selector)
    const expected = `Foobar`
    expect(typeName).toBe(expected)
  })

  it(`creates a valid type name from a nested selector`, () => {
    const selector = `foo.bar.baz`
    const typeName = createTypeName(selector)
    const expected = `FooBarBaz`
    expect(typeName).toBe(expected)
  })
})
