const { GraphQLString, graphql } = require(`graphql`)
const { build } = require(`../..`)
const withResolverContext = require(`../../context`)
const { buildObjectType } = require(`../../types/type-builders`)
const { store } = require(`../../../redux`)
const { dispatch } = store
const { actions } = require(`../../../redux/actions/restricted`)
const { createFieldExtension, createTypes } = actions
require(`../../../db/__tests__/fixtures/ensure-loki`)()

describe(`GraphQL field extensions`, () => {
  beforeEach(() => {
    dispatch({ type: `DELETE_CACHE` })
    const nodes = [
      {
        id: `test1`,
        internal: { type: `Test` },
        somedate: `2019-09-01`,
        otherdate: `2019-09-01`,
      },
      {
        id: `test2`,
        internal: { type: `Test` },
        somedate: `2019-09-13`,
        otherdate: `2019-09-13`,
      },
      {
        id: `test3`,
        internal: { type: `Test` },
        somedate: `2019-09-26`,
        otherdate: `2019-09-26`,
      },
    ]
    nodes.forEach(node => {
      dispatch({ type: `CREATE_NODE`, payload: node })
    })
  })

  it(`allows creating a cutom field extension`, async () => {
    dispatch(
      createFieldExtension({
        name: `birthday`,
        args: {
          greeting: {
            type: GraphQLString,
          },
        },
        extend(options, prevFieldConfig) {
          return {
            type: `String`,
            args: {
              emoji: {
                type: `Boolean`,
              },
            },
            resolve(source, args, context, info) {
              const fieldValue = source[info.fieldName]
              const date = new Date(fieldValue)
              if (date.getMonth() === 8 && date.getDate() === 26) {
                return args.emoji
                  ? `:cake:`
                  : options.greeting || `Happy birthday!`
              }
              return fieldValue
            },
          }
        },
      })
    )
    dispatch(
      createTypes(`
        type Test implements Node @dontInfer {
          somedate: Date @birthday(greeting: "Cheers!")
          otherdate: Date @birthday
        }
      `)
    )
    const query = `
      {
        test(id: { eq: "test3" }) {
          withDefaultArgs: somedate
          withQueryArg: somedate(emoji: true)
          withoutArgs: otherdate
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      test: {
        withQueryArg: `:cake:`,
        withDefaultArgs: `Cheers!`,
        withoutArgs: `Happy birthday!`,
      },
    }
    expect(results).toEqual(expected)
  })

  it(`allows creating a custom field extension (used in type builder)`, async () => {
    dispatch(
      createFieldExtension({
        name: `birthday`,
        args: {
          greeting: {
            type: GraphQLString,
          },
        },
        extend(options, prevFieldConfig) {
          return {
            type: `String`,
            args: {
              emoji: {
                type: `Boolean`,
              },
            },
            resolve(source, args, context, info) {
              const fieldValue = source[info.fieldName]
              const date = new Date(fieldValue)
              if (date.getMonth() === 8 && date.getDate() === 26) {
                return args.emoji
                  ? `:cake:`
                  : options.greeting || `Happy birthday!`
              }
              return fieldValue
            },
          }
        },
      })
    )
    dispatch(
      createTypes(
        buildObjectType({
          name: `Test`,
          fields: {
            somedate: {
              type: `Date`,
              extensions: {
                birthday: {
                  greeting: `Cheers!`,
                },
              },
            },
            otherdate: {
              type: `Date`,
              extensions: {
                birthday: {},
              },
            },
          },
          interfaces: [`Node`],
          extensions: { infer: false },
        })
      )
    )
    const query = `
      {
        test(id: { eq: "test3" }) {
          withDefaultArgs: somedate
          withQueryArg: somedate(emoji: true)
          withoutArgs: otherdate
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      test: {
        withQueryArg: `:cake:`,
        withDefaultArgs: `Cheers!`,
        withoutArgs: `Happy birthday!`,
      },
    }
    expect(results).toEqual(expected)
  })

  it(`creates built-in field extensions`, async () => {
    dispatch(
      createTypes(`
        type Test implements Node @dontInfer {
          somedate: Date @dateformat
          proxy: Date @proxy(from: "somedate")
        }
      `)
    )
    const query = `
      {
        test(id: { eq: "test3" }) {
          somedate(formatString: "YYYY")
          proxy
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      test: {
        proxy: `2019-09-26`,
        somedate: `2019`,
      },
    }
    expect(results).toEqual(expected)
  })

  it.todo(`allows specifying extension options with type string`)
  it.todo(`allows specifying extension options with flat type string`)
  it.todo(`allows specifying extension options with default value`)
  it.todo(`allows wrapping existing field resolver`)

  // TODO: Decide behavior
  it.todo(`input type keeps original type when extension changes field type`)
  it.todo(`handles multiple extensions per field`)
  it.todo(`allows extensions on fields of interface type`) // needs change in processTypeComposer

  it.todo(`shows error message when extension name is reserved`)
  it.todo(`shows error message when extension is already defined`)
  it.todo(`shows error message when no extension definition provided`)
  it.todo(`shows error message when no extension name provided`)

  // we get a defined extension option with a wrong type
  it.todo(`validates type of extension options`)
  // we get an extension option that has not been defined.
  it.todo(`validates non-existing extension options`)
  // we get an extension that has not been defined
  it.todo(`validates non-existing extension`)
  it.todo(`validates extension options when passed with type builder`)
})

const buildSchema = async () => {
  await build({})
  return store.getState().schema
}

const runQuery = async query => {
  const schema = await buildSchema({})
  const results = await graphql(
    schema,
    query,
    undefined,
    withResolverContext({})
  )
  expect(results.errors).toBeUndefined()
  return results.data
}
