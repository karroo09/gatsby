const stringToRegExp = require(`../string-to-regexp`)

describe(`Convert string to RegExp`, () => {
  it(`converts regex and flags`, () => {
    const regex = stringToRegExp(`/\\w+/gimuy`)
    expect(regex).toBeInstanceOf(RegExp)
    expect(regex.source).toBe(`\\w+`)
    expect(regex.flags).toBe(`gimuy`)
  })

  it(`handles slashes`, () => {
    const regex = stringToRegExp(`/\\w+/\\w+/`)
    expect(regex).toBeInstanceOf(RegExp)
    expect(regex.source).toBe(`\\w+\\/\\w+`)
    expect(regex.flags).toBe(``)
  })

  it(`throws on invalid regex string`, () => {
    expect(() => stringToRegExp(`/\\w+`)).toThrow()
    expect(() => stringToRegExp(`\\w+/`)).toThrow()
    expect(() => stringToRegExp(`\\w+`)).toThrow()
    expect(() => stringToRegExp(`i/\\w+/`)).toThrow()
    expect(() => stringToRegExp(`/\\w+/z`)).toThrow()
  })

  it(`handles regex string passed as graphql arg`, async () => {
    const {
      GraphQLSchema,
      GraphQLObjectType,
      GraphQLString,
      graphql,
    } = require(`graphql`)
    const QueryType = new GraphQLObjectType({
      name: `Query`,
      fields: {
        regex: {
          type: GraphQLString,
          args: {
            regex: { type: GraphQLString },
          },
          resolve: (source, args) => args.regex,
        },
      },
    })
    const schema = new GraphQLSchema({ query: QueryType })
    const results = await graphql(
      schema,
      `
        {
          regex(regex: "/\\\\w+/")
        }
      `
    )
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual({ regex: `/\\w+/` })

    const expected = /\w+/
    expect(stringToRegExp(results.data.regex)).toEqual(expected)
  })
})
