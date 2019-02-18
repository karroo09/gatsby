const _ = require(`lodash`)
const { graphql } = require(`graphql`)
const { store } = require(`../../redux`)
const { build } = require(`../index`)
const withResolverContext = require(`../context`)
require(`../../db/__tests__/fixtures/ensure-loki`)()

jest.mock(`../../utils/api-runner-node`)
const apiRunnerNode = require(`../../utils/api-runner-node`)

const nodes = [
  {
    id: `file1`,
    parent: null,
    children: [`md1`],
    internal: {
      type: `File`,
      contentDigest: `file1`,
    },
    name: `1.md`,
  },
  {
    id: `file2`,
    parent: null,
    children: [`md2`],
    internal: {
      type: `File`,
      contentDigest: `file2`,
    },
    name: `2.md`,
  },
  {
    id: `file3`,
    parent: null,
    children: [`author2`, `author1`],
    internal: {
      type: `File`,
      contentDigest: `file3`,
    },
    name: `authors.yaml`,
  },
  {
    id: `md1`,
    parent: `file1`,
    children: [],
    internal: {
      type: `Markdown`,
      contentDigest: `md1`,
    },
    frontmatter: {
      title: `Markdown File 1`,
      date: new Date(Date.UTC(2019, 0, 1)),
      authors: [`author2@example.com`, `author1@example.com`],
    },
  },
  {
    id: `md2`,
    parent: `file2`,
    children: [],
    internal: {
      type: `Markdown`,
      contentDigest: `md2`,
    },
    frontmatter: {
      title: `Markdown File 2`,
      published: false,
      authors: [`author1@example.com`],
    },
  },
  {
    id: `author1`,
    parent: `file3`,
    children: [],
    internal: {
      type: `Author`,
      contentDigest: `author1`,
    },
    name: `Author 1`,
    email: `author1@example.com`,
  },
  {
    id: `author2`,
    parent: `file3`,
    children: [],
    internal: {
      type: `Author`,
      contentDigest: `author1`,
    },
    name: `Author 2`,
    email: `author2@example.com`,
  },
]

const typeDefs = [
  `type Test implements Node { isOnlyDefinedLater: Author } `,
  `type Markdown implements Node { frontmatter: Frontmatter }`,
  `type Frontmatter { authors: [Author] }`,
  `type Author implements Node { posts: [Markdown] }`,
]

const mockAddResolvers = ({ addResolvers }) => {
  addResolvers({
    Author: {
      posts: {
        resolve(source, args, context, info) {
          const { email } = source
          const mds = context.nodeModel.getAllNodes({ type: `Markdown` })
          return mds.filter(md =>
            md.frontmatter.authors.some(authorEmail => authorEmail === email)
          )
        },
      },
    },
    Frontmatter: {
      authors: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          if (
            fieldValue == null ||
            (Array.isArray(fieldValue) && !fieldValue.filter(Boolean).length) ||
            (Array.isArray(fieldValue) &&
              _.isPlainObject(fieldValue.filter(Boolean)[0]))
          ) {
            return fieldValue
          }
          const authors = context.nodeModel.getAllNodes({ type: `Author` })
          return authors.filter(author => fieldValue.includes(author.email))
        },
      },
    },
  })
}

const mockSetFieldsOnGraphQLNodeType = async ({ type: { name } }) => {
  if (name === `Markdown`) {
    return [
      {
        [`frontmatter.authorNames`]: {
          type: [`String`],
          resolve(source, args, context) {
            const { authors: authorEmails } = source
            const nodes = context.nodeModel.getAllNodes({ type: `Author` })
            const authors = nodes.filter(node =>
              authorEmails.includes(node.email)
            )
            return authors.map(author => author.name)
          },
        },
      },
    ]
  } else {
    return []
  }
}

describe(`Schema query`, () => {
  let schema

  const runQuery = query =>
    graphql(schema, query, undefined, withResolverContext({}, schema))

  beforeAll(async () => {
    apiRunnerNode.mockImplementation((api, ...args) => {
      if (api === `setFieldsOnGraphQLNodeType`) {
        return mockSetFieldsOnGraphQLNodeType(...args)
      } else if (api === `addResolvers`) {
        return mockAddResolvers(...args)
      } else {
        return []
      }
    })

    store.dispatch({ type: `DELETE_CACHE` })
    nodes.forEach(node =>
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    )

    typeDefs.forEach(typeDef =>
      store.dispatch({
        type: `ADD_TYPE_DEFS`,
        payload: typeDef,
      })
    )

    await build({})
    schema = store.getState().schema
  })

  it(`processes selection set`, async () => {
    const query = `
      query {
        allMarkdown {
          edges {
            node {
              frontmatter {
                title
                date(formatString: "MM-DD-YYYY")
                published
                authors {
                  name
                  email
                  posts {
                    frontmatter {
                      title
                    }
                  }
                }
                authorNames
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        edges: [
          {
            node: {
              frontmatter: {
                authorNames: [`Author 1`, `Author 2`],
                authors: [
                  {
                    email: `author1@example.com`,
                    name: `Author 1`,
                    posts: [
                      { frontmatter: { title: `Markdown File 1` } },
                      { frontmatter: { title: `Markdown File 2` } },
                    ],
                  },
                  {
                    email: `author2@example.com`,
                    name: `Author 2`,
                    posts: [{ frontmatter: { title: `Markdown File 1` } }],
                  },
                ],
                date: `01-01-2019`,
                published: null,
                title: `Markdown File 1`,
              },
            },
          },
          {
            node: {
              frontmatter: {
                authorNames: [`Author 1`],
                authors: [
                  {
                    email: `author1@example.com`,
                    name: `Author 1`,
                    posts: [
                      { frontmatter: { title: `Markdown File 1` } },
                      { frontmatter: { title: `Markdown File 2` } },
                    ],
                  },
                ],
                date: null,
                published: false,
                title: `Markdown File 2`,
              },
            },
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`processes children fields`, async () => {
    const query = `
      query {
        allFile {
          edges {
            node {
              children {
                ... on Markdown { frontmatter { title } }
                ... on Author { name }
              }
              childMarkdown { frontmatter { title } }
              childrenAuthor { name }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allFile: {
        edges: [
          {
            node: {
              childMarkdown: { frontmatter: { title: `Markdown File 1` } },
              children: [{ frontmatter: { title: `Markdown File 1` } }],
              childrenAuthor: [],
            },
          },
          {
            node: {
              childMarkdown: { frontmatter: { title: `Markdown File 2` } },
              children: [{ frontmatter: { title: `Markdown File 2` } }],
              childrenAuthor: [],
            },
          },
          {
            node: {
              childMarkdown: null,
              children: [{ name: `Author 2` }, { name: `Author 1` }],
              childrenAuthor: expect.arrayContaining([
                { name: `Author 2` },
                { name: `Author 1` },
              ]),
            },
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`processes query args`, async () => {
    const query = `
      query {
        author {
          name
        }
        otherAuthor: author(
          name: { eq: "Author 2" }
        ) {
          name
        }
        allFile(
          filter: {
            children: {
              elemMatch: {
                internal: {
                  type: { eq: "Markdown" }
                }
              }
            }
          }
          sort: { fields: [id], order: DESC }
        ) {
          edges {
            node {
              name
              children {
                id
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      author: {
        name: `Author 1`,
      },
      otherAuthor: {
        name: `Author 2`,
      },
      allFile: {
        edges: expect.arrayContaining([
          {
            node: { name: `2.md`, children: [{ id: `md2` }] },
          },
          {
            node: { name: `1.md`, children: [{ id: `md1` }] },
          },
        ]),
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`processes deep query args`, async () => {
    const query = `
      query {
        allMarkdown(
          filter: {
            frontmatter: {
              authors: {
                elemMatch: {
                  posts: {
                    elemMatch: {
                      frontmatter: {
                        title: { eq: "Markdown File 2" }
                      }
                    }
                  }
                }
              }
            }
          }
          sort: { fields: [frontmatter___title], order: DESC }
        ) {
          edges {
            node {
              id
              frontmatter {
                authors {
                  name
                }
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        edges: expect.arrayContaining([
          {
            node: {
              id: `md2`,
              frontmatter: { authors: [{ name: `Author 1` }] },
            },
          },
          {
            node: {
              id: `md1`,
              frontmatter: {
                authors: expect.arrayContaining([
                  { name: `Author 1` },
                  { name: `Author 2` },
                ]),
              },
            },
          },
        ]),
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`paginates results`, async () => {
    const query = `
      query {
        pages: allMarkdown {
          totalCount
          edges {
            node {
              frontmatter {
                title
                authors {
                  name
                }
              }
            }
          }
        }
        skiplimit: allMarkdown(
          skip: 1
          limit: 1
        ) {
          totalCount
          edges { node { id } }
        }
        findsort: allMarkdown(
          filter: {
            frontmatter: {
              authors: {
                elemMatch: {
                  name: { regex: "/^Author\\\\s\\\\d/" }
                }
              }
            }
          }
          sort: { fields: [frontmatter___title], order: DESC }
        ) {
          totalCount
          edges {
            node {
              frontmatter {
                title
                authors {
                  name
                }
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      findsort: {
        totalCount: 2,
        edges: expect.arrayContaining([
          {
            node: {
              frontmatter: {
                authors: [{ name: `Author 1` }],
                title: `Markdown File 2`,
              },
            },
          },
          {
            node: {
              frontmatter: {
                authors: expect.arrayContaining([
                  { name: `Author 1` },
                  { name: `Author 2` },
                ]),
                title: `Markdown File 1`,
              },
            },
          },
        ]),
      },
      pages: {
        totalCount: 2,
        edges: [
          {
            node: {
              frontmatter: {
                authors: expect.arrayContaining([
                  { name: `Author 1` },
                  { name: `Author 2` },
                ]),
                title: `Markdown File 1`,
              },
            },
          },
          {
            node: {
              frontmatter: {
                authors: [{ name: `Author 1` }],
                title: `Markdown File 2`,
              },
            },
          },
        ],
      },
      skiplimit: { totalCount: 1, edges: [{ node: { id: `md2` } }] },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`groups query results`, async () => {
    const query = `
      query {
        allMarkdown {
          group(field: frontmatter___title) {
            fieldValue
            edges {
              node {
                frontmatter {
                  title
                  date
                }
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        group: [
          {
            fieldValue: `Markdown File 1`,
            edges: [
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 1`,
                    date: `2019-01-01T00:00:00.000Z`,
                  },
                },
              },
            ],
          },
          {
            fieldValue: `Markdown File 2`,
            edges: [
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 2`,
                    date: null,
                  },
                },
              },
            ],
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`groups query results by scalar field with resolver`, async () => {
    const query = `
      query {
        allMarkdown {
          group(field: frontmatter___date) {
            fieldValue
            edges {
              node {
                frontmatter {
                  title
                  date(formatString: "YYYY/MM/DD")
                }
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        group: [
          {
            fieldValue: `2019-01-01T00:00:00.000Z`,
            edges: [
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 1`,
                    date: `2019/01/01`,
                  },
                },
              },
            ],
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  // TODO: We don't yet resolve nodes on group field
  it.skip(`groups query results by linked field`, async () => {
    const query = `
      query {
        allMarkdown {
          group(field: frontmatter___authors___name) {
            fieldValue
            edges {
              node {
                frontmatter {
                  title
                  date
                }
              }
            }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        group: [
          {
            fieldValue: `Author 1`,
            edges: [
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 1`,
                    date: `2019-01-01`,
                  },
                },
              },
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 2`,
                    date: null,
                  },
                },
              },
            ],
          },
          {
            fieldValue: `Author 2`,
            edges: [
              {
                node: {
                  frontmatter: {
                    title: `Markdown File 1`,
                    date: `2019-01-01`,
                  },
                },
              },
            ],
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`returns distinct values`, async () => {
    const query = `
      query {
        allMarkdown {
          distinct(field: frontmatter___authors)
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        distinct: [`author1@example.com`, `author2@example.com`],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  // TODO: We don't yet resolve nodes on distinct field
  it.skip(`returns distinct values on linked field`, async () => {
    const query = `
      query {
        allMarkdown {
          distinct(field: frontmatter___authors___name)
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      allMarkdown: {
        distinct: [`Author 1`, `Author 2`],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })
})
