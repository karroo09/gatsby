const { schemaComposer } = require(`graphql-compose`)
const { GraphQLBoolean } = require(`graphql`)

const { addTypeDefs } = require(`..`)

const typeDefs = [
  `
  type Frontmatter {
    title: String!
    date: Date!
    authors: [Author]
    tags: [String]
    published: Boolean
  }
  type Markdown implements Node {
    html: String
    htmlAst: JSON
    frontmatter: Frontmatter
  }
`,
  `
  type Author implements Node {
    lastname: String
    firstname: String
    email: String
    posts(published: Boolean): [Markdown]
  }
`,
]

describe(`Add types to schema`, () => {
  it(`adds type definitions`, () => {
    typeDefs.forEach(addTypeDefs)

    expect(schemaComposer.has(`Frontmatter`)).toBeTruthy()
    expect(schemaComposer.has(`Markdown`)).toBeTruthy()
    expect(schemaComposer.has(`Author`)).toBeTruthy()

    expect(schemaComposer.getTC(`Frontmatter`).hasInterface(`Node`)).toBeFalsy()
    expect(schemaComposer.getTC(`Markdown`).hasInterface(`Node`)).toBeTruthy()
    expect(schemaComposer.getTC(`Author`).hasInterface(`Node`)).toBeTruthy()

    expect(schemaComposer.getTC(`Frontmatter`).getFieldNames()).toEqual([
      `title`,
      `date`,
      `authors`,
      `tags`,
      `published`,
    ])
    expect(schemaComposer.getTC(`Markdown`).getFieldNames()).toEqual([
      `html`,
      `htmlAst`,
      `frontmatter`,
    ])
    expect(schemaComposer.getTC(`Author`).getFieldNames()).toEqual([
      `lastname`,
      `firstname`,
      `email`,
      `posts`,
    ])

    expect(
      schemaComposer.getTC(`Author`).getFieldArgs(`posts`).published
    ).toEqual(expect.objectContaining({ type: GraphQLBoolean }))

    expect(
      schemaComposer
        .getTC(`Frontmatter`)
        .getFieldTC(`authors`)
        .getTypeName()
    ).toBe(`Author`)
    expect(
      schemaComposer
        .getTC(`Markdown`)
        .getFieldTC(`frontmatter`)
        .getTypeName()
    ).toBe(`Frontmatter`)
    expect(
      schemaComposer
        .getTC(`Author`)
        .getFieldTC(`posts`)
        .getTypeName()
    ).toBe(`Markdown`)
  })
})
