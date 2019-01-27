const createKey = require(`../../utils/create-field-name`)

describe(`[legacy] createKey`, () => {
  it(`leaves valid strings as is`, () => {
    ;[`validstring`, `_hello`, `_`].forEach(input => {
      expect(createKey(input)).toBe(input)
    })
  })

  it(`replaces invalid characters`, () => {
    ;[
      [`/hello`, `_hello`],
      [`/path/to/some/module`, `_path_to_some_module`],
      [`01234`, `_1234`],
    ].forEach(([input, output]) => {
      expect(createKey(input)).toBe(output)
    })
  })

  it(`throws on leading double underscore`, () => {
    ;[`/*`, `/*.js`].forEach(input => expect(() => createKey(input)).toThrow())
  })

  it(`does not generate same key for different input`, () => {
    ;[[`x/*.js`, `x*js`]].forEach(([one, two]) => {
      expect(createKey(one)).not.toBe(createKey(two))
    })
  })
})
