const merge = require(`../merge`)

describe(`merge util`, () => {
  it(`merges simple objects`, () => {
    const obj2 = {
      foo: {
        bar: {
          baz: true,
        },
      },
      qux: true,
    }

    const obj1 = {
      bar: true,
      baz: {
        foo: true,
      },
      foo: {
        bar: {
          qux: true,
        },
        baz: true,
      },
    }

    const obj3 = {
      foo: {
        bar: {
          foo: {
            bar: true,
          },
        },
      },
    }

    const obj1Copy = { ...obj1 }
    const obj2Copy = { ...obj2 }
    const obj3Copy = { ...obj3 }

    const expected = {
      bar: true,
      baz: {
        foo: true,
      },
      foo: {
        bar: {
          baz: true,
          qux: true,
          foo: {
            bar: true,
          },
        },
        baz: true,
      },
      qux: true,
    }

    expect(merge(obj1, null, obj2, obj3)).toEqual(expected)
    expect(obj1).toEqual(obj1Copy)
    expect(obj2).toEqual(obj2Copy)
    expect(obj3).toEqual(obj3Copy)
  })
})
