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
      [`01234`, `_01234`],
      [`/*`, `_x`],
      [`*.js`, `_xjs`],
    ].forEach(([input, output]) => {
      expect(createKey(input)).toBe(output)
    })
  })

  it(`does not generate same key for different input`, () => {
    ;[[`x/*.js`, `x*js`]].forEach(([one, two]) => {
      expect(createKey(one)).not.toBe(createKey(two))
    })
  })
})
