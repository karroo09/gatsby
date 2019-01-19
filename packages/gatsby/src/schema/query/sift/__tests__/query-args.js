const { dropQueryOperators, prepareQueryArgs } = require(`../query-args`)

describe(`Drop query operators`, () => {
  it(`removes leaf fields from filter`, () => {
    const filter = {
      foo: { $eq: `bar` },
      bar: { $ne: false },
      baz: { $in: [1, 2, 3] },
      qux: { foo: { $nin: [`foo`, `bar`] } },
    }
    const expected = {
      foo: true,
      bar: true,
      baz: true,
      qux: { foo: true },
    }
    expect(dropQueryOperators(filter)).toEqual(expected)
  })

  it(`removes leaf fields from nested filter`, () => {
    const filter = {
      foo: { $eq: `foo` },
      bar: {
        foo: { $ne: `bar` },
        bar: {
          foo: { $in: [1, 2, 3] },
          bar: {
            foo: { $nin: [1, 2, 3] },
          },
        },
      },
      baz: { $ne: true },
      qux: {
        foo: { $eq: false },
      },
    }
    const expected = {
      foo: true,
      bar: {
        foo: true,
        bar: {
          foo: true,
          bar: {
            foo: true,
          },
        },
      },
      baz: true,
      qux: {
        foo: true,
      },
    }
    expect(dropQueryOperators(filter)).toEqual(expected)
  })
})

describe(`Prepare query arguments for Sift`, () => {
  it(`prepends operator fields with $`, () => {
    const filter = {
      foo: { eq: `bar` },
      bar: { ne: false },
      baz: { in: [1, 2, 3] },
      qux: { foo: { nin: [`foo`, `bar`] } },
    }
    const expected = {
      foo: { $eq: `bar` },
      bar: { $ne: false },
      baz: { $in: [1, 2, 3] },
      qux: { foo: { $nin: [`foo`, `bar`] } },
    }
    expect(prepareQueryArgs(filter)).toEqual(expected)
  })

  it(`constructs RegExp for regex operator fields`, () => {
    const regex = `/\\.png$/i`
    const filter = {
      foo: { regex },
    }
    const result = prepareQueryArgs(filter)
    expect(result.foo.$regex).toBeInstanceOf(RegExp)
    expect(result.foo.$regex.test(`foo.PNG`)).toBeTruthy()
    expect(result.foo.$regex.test(`foo.png.bak`)).toBeFalsy()
  })

  it(`constructs RegExp for glob operator fields`, () => {
    const glob = `*.png`
    const filter = {
      foo: { glob },
    }
    const result = prepareQueryArgs(filter)
    expect(result.foo.$regex).toBeInstanceOf(RegExp)
    expect(result.foo.$regex.test(`foo.png`)).toBeTruthy()
    expect(result.foo.$regex.test(`foo.png.bak`)).toBeFalsy()
  })

  it(`allows negations in glob operator fields`, () => {
    const glob = `!*.png`
    const filter = {
      foo: { glob },
    }
    const result = prepareQueryArgs(filter)
    expect(result.foo.$regex).toBeInstanceOf(RegExp)
    expect(result.foo.$regex.test(`foo.png`)).toBeFalsy()
    expect(result.foo.$regex.test(`foo.png.bak`)).toBeTruthy()
  })
})
