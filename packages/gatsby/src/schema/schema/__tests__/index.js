const { GraphQLSchema, GraphQLBoolean, GraphQLInt } = require(`graphql`)

const { buildSchema, updateSchema } = require(`..`)

const { getById, getNodesByType } = require(`../../db`)
jest.mock(`../../db`, () => {
  const nodes = [
    {
      id: 1,
      parent: 2,
      children: [],
      internal: { type: `Markdown` },
      frontmatter: { important: true, authors: [`Foo`] },
    },
    {
      id: 2,
      parent: null,
      children: [1],
      internal: { type: `File` },
    },
    {
      id: 3,
      parent: null,
      children: [],
      internal: { type: `Author` },
      lastname: `Foo`,
      firstname: `Bar`,
    },
  ]
  return {
    getById: id => nodes.find(node => node.id === id),
    getNodesByType: jest
      .fn()
      .mockImplementation(type =>
        nodes.filter(node => node.internal.type === type)
      ),
    getTypes: () =>
      Array.from(
        nodes.reduce(
          (acc, node) => acc.add(node.internal.type) || acc,
          new Set()
        )
      ),
  }
})

jest.mock(`../../../utils/api-runner-node`, () => (api, options) => {
  switch (api) {
    case `addTypeDefs`: {
      const typeDefs = [
        `type Frontmatter {
          title: String!
          date: Date!
          authors: [Author!]! @link(by: "lastname")
          tags: [String]
          published: Boolean
        }
        type Markdown implements Node {
          html: String
          htmlAst: JSON
          frontmatter: Frontmatter
        }`,
        `type Author implements Node {
          lastname: String
          firstname: String
          email: String
          posts: [Markdown!]!
        }`,
        `type SitePage implements Node {
          title: String
        }
        `,
      ]
      typeDefs.forEach(options.addTypeDefs)
      break
    }

    case `addResolvers`: {
      const resolvers = {
        Author: {
          // When the schema is built, access the resolvers from `context.resolvers`!
          // See the tests in `../../__tests__/index.js`
          posts: async (source, ignoredArgs, context, info) => {
            const {
              resolve,
            } = info.schema.getQueryType().getFields().allMarkdown
            const { firstname, lastname } = source
            const args = {
              filter: {
                frontmatter: {
                  authors: {
                    firstname: { eq: firstname },
                    lastname: { eq: lastname },
                  },
                },
              },
            }
            return (await resolve(source, args, context, info)).edges.map(
              ({ node }) => node
            )
          },
        },
      }
      options.addResolvers(resolvers)
      break
    }

    case `setFieldsOnGraphQLNodeType`:
      return options.type.name === `Markdown`
        ? [
            {
              archived: `Boolean`,
              [`frontmatter.viral`]: `Boolean`,
            },
          ]
        : []

    default:
    //noop
  }
  return null
})

describe(`Schema builder`, () => {
  let schema
  beforeAll(async () => {
    schema = await buildSchema()
    require(`../../../redux`).store.dispatch({
      type: `SET_SCHEMA`,
      payload: schema,
    })
  })

  it(`builds schema with root query fields`, async () => {
    expect(schema).toBeInstanceOf(GraphQLSchema)
    expect(Object.keys(schema.getQueryType().getFields())).toEqual(
      expect.arrayContaining([`markdown`, `allMarkdown`, `author`, `allAuthor`])
    )
  })

  it(`build schema with input fields`, () => {
    const args = schema
      .getQueryType()
      .getFields()
      .allMarkdown.args.map(({ type, name }) => ({ type, name }))
    expect(args).toEqual(
      expect.arrayContaining([
        { name: `filter`, type: schema.getType(`MarkdownInput`) },
        { name: `sort`, type: schema.getType(`MarkdownSortInput`) },
        { name: `skip`, type: GraphQLInt },
        { name: `limit`, type: GraphQLInt },
      ])
    )
  })

  it(`builds schema with children convenience fields`, () => {
    const fields = Object.values(schema.getType(`File`).getFields()).map(
      ({ name, type }) => ({ name, type })
    )
    expect(fields).toEqual(
      expect.arrayContaining([
        { name: `childMarkdown`, type: schema.getType(`Markdown`) },
      ])
    )
  })

  it(`builds schema with directives`, () => {
    expect(schema.getDirectives().map(directive => directive.name)).toEqual([
      `deprecated`,
      `include`,
      `skip`,
      `dateformat`,
      `link`,
    ])
  })

  it(`builds schema with added inferred fields and types`, () => {
    expect(schema.getType(`Frontmatter`).getFields().important.type).toBe(
      GraphQLBoolean
    )
    expect(schema.getType(`File`).getFields().internal.type.name).toBe(
      `Internal`
    )
  })

  it(`builds schema with fields added by setFieldsOnGraphQLNodeType`, () => {
    expect(schema.getType(`Markdown`).getFields().archived.type).toBe(
      GraphQLBoolean
    )
    expect(schema.getType(`Frontmatter`).getFields().viral.type).toBe(
      GraphQLBoolean
    )
  })

  it(`builds schema with resolvers added by @link directive`, () => {
    expect(
      schema.getType(`Frontmatter`).getFields().authors.resolve
    ).toBeInstanceOf(Function)
  })

  it(`builds schema with added custom resolvers`, async () => {
    expect(schema.getType(`Author`).getFields().posts.resolve).toBeInstanceOf(
      Function
    )
    const author = getById(3)
    const authorType = schema.getType(`Author`)
    const posts = await authorType.getFields().posts.resolve(
      author,
      {},
      {},
      {
        fieldName: `posts`,
        returnType: authorType.getFields().posts.type,
        schema,
      }
    )
    expect(posts.length).toBe(1)
    expect(posts[0].frontmatter.authors[0]).toEqual(author)
  })

  it(`builds schema with Node interface`, () => {
    expect(schema.getType(`Node`).resolveType).toBeInstanceOf(Function)
    expect(schema.getType(`Node`).resolveType(getById(1))).toBe(`Markdown`)
  })

  it(`updates schema with SitePage type`, async () => {
    getNodesByType.mockReturnValue([{ title: `Foo`, keywords: [`foo`] }])
    await updateSchema()
    const SitePage = schema.getQueryType().getFields().sitePage
    expect(SitePage.type.name).toBe(`SitePage`)
    expect(Object.keys(SitePage.type.getFields())).toEqual(
      expect.arrayContaining([`title`, `keywords`])
    )
    expect(SitePage.args.map(({ name }) => name)).toEqual(
      expect.arrayContaining([`title`, `keywords`])
    )
  })
})
