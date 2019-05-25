const { GraphQLString, graphql } = require(`graphql`)
const { build } = require(`../..`)
const withResolverContext = require(`../../context`)
const { store } = require(`../../../redux`)
const { dispatch } = store
const { actions } = require(`../../../redux/actions/restricted`)
const { createFieldExtension, createTypes } = actions

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

  it.todo(`allows creating a custom field extension (used in type builder)`)
  it.todo(`creates built-in field extensions`)
  it.todo(`allows specifying extension options with type string`)
  it.todo(`allows specifying extension options with flat type string`)
  it.todo(`allows specifying extension options with default value`)
  it.todo(`allows wrapping existing field resolver`)

  it.todo(`shows error message when extension name is reserved`)
  it.todo(`shows error message when extension is already defined`)
  it.todo(`shows error message when no extension definition provided`)
  it.todo(`shows error message when no extension name provided`)
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
