const { graphql } = require(`gatsby/graphql`)
const { store } = require(`../../../gatsby/src/redux`)
const { getNode, getNodesByType } = require(`../../../gatsby/src/redux/nodes`)

const { onCreateNode } = require(`../gatsby-node`)

let buildSchema
let pluginOptions

async function runQuery(nodes, query, options = {}) {
  const { pathPrefix } = options
  if (pathPrefix) {
    store.dispatch({ type: `SET_SITE_CONFIG`, payload: { pathPrefix } })
  }
  pluginOptions = options

  for (const node of nodes) {
    store.dispatch({ type: `CREATE_NODE`, payload: node })
  }

  const { schemaComposer } = require(`graphql-compose`)
  schemaComposer.Query.addFields({
    listNode: {
      type: [`MarkdownRemark`],
      resolve: () =>
        nodes.filter(node => node.internal.type === `MarkdownRemark`),
    },
  })
  const schema = await buildSchema()

  const context = { path: `/` }
  return graphql(schema, `{ listNode { ${query} } }`, context, context)
}

jest.mock(`../../../gatsby/src/utils/api-runner-node`)
const apiRunner = require(`../../../gatsby/src/utils/api-runner-node`)
apiRunner.mockImplementation(async (api, options) => {
  if (api === `setFieldsOnGraphQLNodeType`) {
    const extendNodeType = require(`../extend-node-type`)
    const { pathPrefix } = store.getState().config
    const fields = await extendNodeType(
      {
        type: { name: `MarkdownRemark` },
        cache: new Map(),
        reporter: jest.fn(),
        getNode,
        getNodesByType,
        pathPrefix,
      },
      { plugins: [], ...options, ...pluginOptions }
    )
    return [fields]
  }
  return []
})

const bootstrapTest = (label, content, query, test, options = {}) => {
  const node = {
    id: `whatever`,
    children: [],
    internal: {
      contentDigest: `whatever`,
      mediaType: `text/markdown`,
    },
  }
  // Make some fake functions its expecting.
  const loadNodeContent = node => Promise.resolve(node.content)

  it(label, async done => {
    node.content = content
    const createNode = markdownNode => {
      runQuery([markdownNode], query, options).then(result => {
        try {
          test(result.data.listNode[0])
          done()
        } catch (err) {
          done.fail(err)
        }
      })
    }
    const createParentChildLink = jest.fn()
    const actions = { createNode, createParentChildLink }
    const createNodeId = jest.fn()
    createNodeId.mockReturnValue(`uuid-from-gatsby`)
    await onCreateNode(
      {
        node,
        loadNodeContent,
        actions,
        createNodeId,
      },
      options
    )
  })
}

describe(`Extend fields on MarkdownRemark nodes`, () => {
  beforeEach(() => {
    store.dispatch({ type: `DELETE_CACHE` })
    const { schemaComposer } = require(`graphql-compose`)
    schemaComposer.clear()
    jest.isolateModules(() => {
      buildSchema = require(`../../../gatsby/src/schema/schema`).buildSchema
    })
  })

  describe(`Excerpt is generated correctly from schema`, () => {
    bootstrapTest(
      `correctly loads an excerpt`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is my little pony?`,
      `excerpt
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt).toMatch(`Where oh where is my little pony?`)
      }
    )

    bootstrapTest(
      `correctly loads a default excerpt`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---`,
      `excerpt
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt).toMatch(``)
      }
    )

    bootstrapTest(
      `correctly uses excerpt separator`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is my little pony?
<!-- end -->
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.

In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
    `,
      `excerpt
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt).toMatch(`Where oh where is my little pony?`)
      },
      { excerpt_separator: `<!-- end -->` }
    )

    const content = `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is my little pony? Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.
In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
`

    bootstrapTest(
      `correctly prunes length to default value`,
      content,
      `excerpt
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt.length).toBe(139)
      }
    )

    bootstrapTest(
      `correctly prunes length to provided parameter`,
      content,
      `excerpt(pruneLength: 50)
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt.length).toBe(46)
      }
    )

    bootstrapTest(
      `correctly prunes length to provided parameter with truncate`,
      content,
      `excerpt(pruneLength: 50, truncate: true)
       frontmatter {
         title
       }
    `,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.excerpt.length).toBe(50)
      }
    )
  })

  bootstrapTest(
    `given an html format, it correctly maps nested markdown to html`,
    `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh [*where*](nick.com) **_is_** ![that pony](pony.png)?`,
    `excerpt(format: HTML)
      frontmatter {
          title
      }
      `,
    node => {
      expect(node).toMatchSnapshot()
      expect(node.excerpt).toMatch(
        `<p>Where oh <a href="nick.com"><em>where</em></a> <strong><em>is</em></strong> <img src="pony.png" alt="that pony">?</p>`
      )
    }
  )

  bootstrapTest(
    `given raw html in the text body, this html is not escaped`,
    `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where is my <code>pony</code> named leo?`,
    `excerpt(format: HTML)
      frontmatter {
          title
      }
      `,
    node => {
      expect(node).toMatchSnapshot()
      expect(node.excerpt).toMatch(
        `<p>Where is my <code>pony</code> named leo?</p>`
      )
    },
    { excerpt_separator: `<!-- end -->` }
  )

  bootstrapTest(
    `given an html format, it prunes large excerpts`,
    `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is that pony? Is he in the stable or down by the stream?`,
    `excerpt(format: HTML, pruneLength: 50)
      frontmatter {
          title
      }
      `,
    node => {
      expect(node).toMatchSnapshot()
      expect(node.excerpt).toMatch(
        `<p>Where oh where is that pony? Is he in the stable…</p>`
      )
    }
  )

  bootstrapTest(
    `given an html format, it respects the excerpt_separator`,
    `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is that *pony*? Is he in the stable or by the stream?
<!-- end -->
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.
`,
    `excerpt(format: HTML, pruneLength: 50)
    frontmatter {
        title
    }
    `,
    node => {
      expect(node).toMatchSnapshot()
      expect(node.excerpt).toMatch(
        `<p>Where oh where is that <em>pony</em>? Is he in the stable or by the stream?</p>`
      )
    },
    { excerpt_separator: `<!-- end -->` }
  )

  describe(`Wordcount and timeToRead are generated correctly from schema`, () => {
    bootstrapTest(
      `correctly uses wordCount parameters`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
Where oh where is my little pony? Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.

In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
`,
      `wordCount {
         words
         paragraphs
         sentences
       }
       frontmatter {
         title
       }`,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.wordCount).toEqual({
          paragraphs: 2,
          sentences: 19,
          words: 150,
        })
      }
    )

    const content = `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
`

    bootstrapTest(
      `correctly uses a default value for wordCount`,
      content,
      `wordCount {
         words
         paragraphs
         sentences
       }
       frontmatter {
         title
       }`,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.wordCount).toEqual({
          paragraphs: null,
          sentences: null,
          words: null,
        })
      }
    )

    bootstrapTest(
      `correctly uses a default value for timeToRead`,
      content,
      `timeToRead
       frontmatter {
         title
       }`,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.timeToRead).toBe(1)
      }
    )
  })

  describe(`Table of contents is generated correctly from schema`, () => {
    // Used to verify that console.warn is called when field not found
    jest.spyOn(global.console, `warn`)

    bootstrapTest(
      `returns null on non existing table of contents field`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
# first title

some text

## second title

some other text
`,
      `tableOfContents
       frontmatter {
         title
       }`,
      node => {
        expect(node).toMatchSnapshot()
        expect(console.warn).toBeCalled()
        expect(node.tableOfContents).toBe(null)
      }
    )

    bootstrapTest(
      `correctly generates table of contents`,
      `---
title: "my little pony"
date: "2017-09-18T23:19:51.246Z"
---
# first title

some text

## second title

some other text

# third title

final text
`,
      `tableOfContents(pathToSlugField: "frontmatter.title")
       frontmatter {
         title
       }`,
      node => {
        expect(node).toMatchSnapshot()
      }
    )
  })

  describe(`Links are correctly prefixed`, () => {
    bootstrapTest(
      `correctly prefixes links`,
      `
This is [a link](/path/to/page1).

This is [a reference]

[a reference]: /path/to/page2
`,
      `html`,
      node => {
        expect(node).toMatchSnapshot()
        expect(node.html).toMatch(`<a href="/prefix/path/to/page1">`)
        expect(node.html).toMatch(`<a href="/prefix/path/to/page2">`)
      },
      { pathPrefix: `/prefix` }
    )
  })
})
