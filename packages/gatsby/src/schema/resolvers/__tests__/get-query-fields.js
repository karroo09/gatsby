const getQueryFields = require(`../get-query-fields`)

describe(`Get query fields`, () => {
  it(`collects query fields from filter, sort, group, and distinct`, () => {
    const rp = {
      args: {
        filter: {
          foo: {
            bar: { eq: true },
            baz: {
              foo: { in: [1, 2] },
            },
          },
          bar: { in: [1, 2] },
        },
        sort: {
          fields: [`foo.baz.foo`, `foo.baz.bar`, `foo.baz.baz`],
          order: [`ASC`, `DESC`],
        },
      },
      projection: {
        group: `bar`,
        distinct: `foo.baz.qux`,
      },
    }
    const expected = {
      foo: {
        bar: true,
        baz: {
          foo: true,
          bar: true,
          baz: true,
          qux: true,
        },
      },
      bar: true,
    }
    const queryFields = getQueryFields(rp)
    expect(queryFields).toEqual(expected)
  })

  it(`handles empty args`, () => {
    const rp = { args: {}, projection: {} }
    expect(getQueryFields(rp)).toEqual({})
  })
})
