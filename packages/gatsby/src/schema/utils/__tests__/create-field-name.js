const createFieldName = require(`../create-field-name`)

// describe(`createFieldName util`, () => {
//   it(`creates a valid field name from a key with spaces`, () => {
//     const key = `foo bar baz`
//     const fieldName = createFieldName(key)
//     const expected = `foo_bar_baz`
//     expect(fieldName).toBe(expected)
//   })

//   it(`creates a valid field name from a key starting with a digit`, () => {
//     const key = `0foo bar..baz`
//     const fieldName = createFieldName(key)
//     const expected = `_foo_bar__baz`
//     expect(fieldName).toBe(expected)
//   })

//   it(`creates a valid field name from a key with unsafe characters`, () => {
//     const key = `00^°"§$%&/()=?{}[]\`´\\+*~#'-_:;,<>|`
//     const fieldName = createFieldName(key)
//     const expected = `_0________________________________`
//     expect(fieldName).toBe(expected)
//   })

//   it(`creates a valid field name from a key with emoji`, () => {
//     const key = `foo🐱bar`
//     const fieldName = createFieldName(key)
//     const expected = `foo__bar`
//     expect(fieldName).toBe(expected)
//   })

//   it(`throws on key with leading double underscore`, () => {
//     const key = `__foobar`
//     expect(() => createFieldName(key)).toThrow()
//   })

//   it(`throws on key with two leading unsafe chars`, () => {
//     const key = `0$foobar`
//     expect(() => createFieldName(key)).toThrow()
//   })

//   it(`throws on null`, () => {
//     const key = null
//     expect(() => createFieldName(key)).toThrow()
//   })
// })

describe(`createFieldName util`, () => {
  it(`creates a valid field name from a key with spaces`, () => {
    const key = `foo bar baz`
    const fieldName = createFieldName(key)
    const expected = `foo_bar_baz`
    expect(fieldName).toBe(expected)
  })

  it(`creates a valid field name from a key starting with a digit`, () => {
    const key = `0foo bar..baz`
    const fieldName = createFieldName(key)
    const expected = `_0foo_bar__baz`
    expect(fieldName).toBe(expected)
  })

  it(`creates a valid field name from a key with unsafe characters`, () => {
    const key = `00^°"§$%&/()=?{}[]\`´\\+*~#'-_:;,<>|`
    const fieldName = createFieldName(key)
    const expected = `_00________________________________`
    expect(fieldName).toBe(expected)
  })

  it(`creates a valid field name from a key with emoji`, () => {
    const key = `foo🐱bar`
    const fieldName = createFieldName(key)
    const expected = `foo__bar`
    expect(fieldName).toBe(expected)
  })

  it(`sanitizes key with leading double underscore`, () => {
    const key = `__fööbar`
    const fieldName = createFieldName(key)
    const expected = `_xfxxbar`
    expect(fieldName).toBe(expected)
  })

  it(`sanitizes key with two leading unsafe chars`, () => {
    const key = `0$foobar`
    const fieldName = createFieldName(key)
    const expected = `_0_foobar`
    expect(fieldName).toBe(expected)
  })

  it(`throws on null`, () => {
    const key = null
    expect(() => createFieldName(key)).toThrow()
  })
})
