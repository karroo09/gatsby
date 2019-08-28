const { graphql } = require(`gatsby/graphql`)
const { createMarkdownNode } = require(`../on-create-node`)
const { createSchemaCustomization } = require(`../create-schema-customization`)
const { build } = require(`gatsby/dist/schema`)
const { buildObjectType } = require(`gatsby/dist/schema/types/type-builders`)
const withResolverContext = require(`gatsby/dist/schema/context`)
const { store } = require(`gatsby/dist/redux`)
const { actions } = require(`gatsby/dist/redux/actions`)
const { createNode, createTypes, createResolverContext } = actions
const { stripIndent: strip } = require(`gatsby-cli/lib/reporter`)

const noop = () => {}

const buildSchema = async () => {
  await build({})
  return store.getState().schema
}

const runQuery = async ({ markdown, options, query }) => {
  const node = createMarkdownNode({
    markdown,
    createNodeId: () => `md1`,
    createContentDigest: () => `md1`,
    parent: {
      id: `file1`,
      internal: {
        type: `File`,
        content: markdown,
        contentDigest: `file1`,
      },
      absolutePath: `/home/stefan/md.md`,
    },
  })
  store.dispatch({ type: `DELETE_CACHE` })
  createNode(node, { name: `gatsby-transformer-remark` })(store.dispatch)
  await createSchemaCustomization(
    {
      actions: {
        createTypes: types =>
          store.dispatch(
            createTypes(types, { name: `gatsby-transformer-remark` })
          ),
        createResolverContext: ctx =>
          createResolverContext(ctx, { name: `gatsby-transformer-remark` })(
            store.dispatch
          ),
      },
      cache: {
        get: noop,
        set: noop,
      },
      reporter: {
        error: noop,
        warn: noop,
        info: noop,
      },
      schema: {
        buildObjectType,
      },
    },
    options
  )
  const schema = await buildSchema()
  const { data, errors } = await graphql(
    schema,
    query,
    undefined,
    withResolverContext({}, schema)
  )
  expect(errors).toBeUndefined()
  return data
}

describe.only(`Excerpt is generated correctly from schema`, () => {
  it.only(`correctly loads an excerpt`, async () => {
    debugger
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is my little pony?
      `
    const query = `
      {
        markdownRemark {
          excerpt
          excerptAst
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`Where oh where is my little pony?\n`)
    expect(markdownRemark.excerptAst).toEqual({
      children: [
        {
          children: [
            {
              type: `text`,
              value: `Where oh where is my little pony?`,
            },
          ],
          properties: {},
          tagName: `p`,
          type: `element`,
        },
      ],
      data: { quirksMode: false },
      type: `root`,
    })
  })

  it(`correctly loads a default excerpt`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---
      `
    const query = `
      {
        markdownRemark {
          excerpt
          excerptAst
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(``)
    expect(markdownRemark.excerptAst).toEqual({
      children: [],
      data: { quirksMode: false },
      type: `root`,
    })
  })

  it(`correctly uses excerpt separator`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is my little pony?
      <!-- end -->
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.

      In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
      `
    const query = `
      {
        markdownRemark {
          excerpt
          excerptAst
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: { excerpt_separator: `<!-- end -->` },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`Where oh where is my little pony?`)
    expect(markdownRemark.excerptAst).toEqual({
      children: [
        {
          children: [
            {
              type: `text`,
              value: `Where oh where is my little pony?`,
            },
          ],
          properties: {},
          tagName: `p`,
          type: `element`,
        },
        {
          type: `text`,
          value: `\n`,
        },
      ],
      data: { quirksMode: false },
      type: `root`,
    })
  })

  describe(`content with separator`, () => {
    const contentWithSeparator = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where **is** my little pony?
      <!-- end -->
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.

      In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
      `

    it(`given PLAIN correctly uses excerpt separator`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt(format: PLAIN)
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: contentWithSeparator,
        query,
        options: { excerpt_separator: `<!-- end -->` },
      })
      expect(markdownRemark).toMatchSnapshot()
      expect(markdownRemark.excerpt).toBe(`Where oh where is my little pony?`)
    })

    it(`given HTML correctly uses excerpt separator`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt(format: HTML)
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: contentWithSeparator,
        query,
        options: { excerpt_separator: `<!-- end -->` },
      })
      expect(markdownRemark).toMatchSnapshot()
      expect(markdownRemark.excerpt).toBe(
        `<p>Where oh where <strong>is</strong> my little pony?</p>\n`
      )
    })

    it(`given MARKDOWN correctly uses excerpt separator`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt(format: MARKDOWN)
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: contentWithSeparator,
        query,
        options: { excerpt_separator: `<!-- end -->` },
      })
      expect(markdownRemark).toMatchSnapshot()
      expect(markdownRemark.excerpt).toBe(
        `Where oh where **is** my little pony?\n`
      )
    })
  })

  describe(`content`, () => {
    const content = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is my little pony? Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.
      In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
      `

    it(`correctly prunes length to default value`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt
            excerptAst
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: content,
        query,
      })
      expect(markdownRemark).toMatchSnapshot()
      // expect(markdownRemark.excerpt).toBe(``)
      expect(markdownRemark.excerpt.length).toBe(139)
      expect(markdownRemark.excerptAst.children.length).toBe(1)
      expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
      expect(
        markdownRemark.excerptAst.children[0].children[0].value.length
      ).toBe(139)
    })

    it(`correctly prunes length to provided parameter`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt(pruneLength: 50)
            excerptAst(pruneLength: 50)
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: content,
        query,
      })
      expect(markdownRemark).toMatchSnapshot()
      // expect(markdownRemark.excerpt).toBe(``)
      expect(markdownRemark.excerpt.length).toBe(46)
      expect(markdownRemark.excerptAst.children.length).toBe(1)
      expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
      expect(
        markdownRemark.excerptAst.children[0].children[0].value.length
      ).toBe(46)
    })

    it(`correctly prunes length to provided parameter with truncate`, async () => {
      const query = `
        {
          markdownRemark {
            excerpt(pruneLength: 50, truncate: true)
            excerptAst(pruneLength: 50, truncate: true)
          }
        }
      `
      const { markdownRemark } = await runQuery({
        markdown: content,
        query,
      })
      expect(markdownRemark).toMatchSnapshot()
      // expect(markdownRemark.excerpt).toBe(``)
      expect(markdownRemark.excerpt.length).toBe(50)
      expect(markdownRemark.excerptAst.children.length).toBe(1)
      expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
      expect(
        markdownRemark.excerptAst.children[0].children[0].value.length
      ).toBe(50)
    })

    describe(`with excerpt_separator option`, () => {
      it(`correctly prunes length to default value`, async () => {
        const query = `
          {
            markdownRemark {
              excerpt
              excerptAst
            }
          }
        `
        const { markdownRemark } = await runQuery({
          markdown: content,
          query,
          options: { excerpt_separator: `<!-- end -->` },
        })
        expect(markdownRemark).toMatchSnapshot()
        // expect(markdownRemark.excerpt).toBe(``)
        expect(markdownRemark.excerpt.length).toBe(139)
        expect(markdownRemark.excerptAst.children.length).toBe(1)
        expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
        expect(
          markdownRemark.excerptAst.children[0].children[0].value.length
        ).toBe(139)
      })

      it(`correctly prunes length to provided parameter`, async () => {
        const query = `
          {
            markdownRemark {
              excerpt(pruneLength: 50)
              excerptAst(pruneLength: 50)
            }
          }
        `
        const { markdownRemark } = await runQuery({
          markdown: content,
          query,
          options: { excerpt_separator: `<!-- end -->` },
        })
        expect(markdownRemark).toMatchSnapshot()
        // expect(markdownRemark.excerpt).toBe(``)
        expect(markdownRemark.excerpt.length).toBe(46)
        expect(markdownRemark.excerptAst.children.length).toBe(1)
        expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
        expect(
          markdownRemark.excerptAst.children[0].children[0].value.length
        ).toBe(46)
      })

      it(`correctly prunes length to provided parameter with truncate`, async () => {
        const query = `
          {
            markdownRemark {
              excerpt(pruneLength: 50, truncate: true)
              excerptAst(pruneLength: 50, truncate: true)
            }
          }
        `
        const { markdownRemark } = await runQuery({
          markdown: content,
          query,
          options: { excerpt_separator: `<!-- end -->` },
        })
        expect(markdownRemark).toMatchSnapshot()
        // expect(markdownRemark.excerpt).toBe(``)
        expect(markdownRemark.excerpt.length).toBe(50)
        expect(markdownRemark.excerptAst.children.length).toBe(1)
        expect(markdownRemark.excerptAst.children[0].children.length).toBe(1)
        expect(
          markdownRemark.excerptAst.children[0].children[0].value.length
        ).toBe(50)
      })
    })
  })

  it(`given an html format, it correctly maps nested markdown to html`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh [*where*](nick.com) **_is_** ![that pony](pony.png)?
      `
    const query = `
      {
        markdownRemark {
          excerpt(format: HTML)
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `<p>Where oh <a href="nick.com"><em>where</em></a> <strong><em>is</em></strong> <img src="pony.png" alt="that pony">?</p>`
    )
  })

  it(`excerpt does have missing words and extra spaces`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh [*where*](nick.com) **_is_** ![that pony](pony.png)?
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`Where oh where is that pony?`)
  })

  it(`excerpt does not have leading or trailing spaces`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      My pony likes space on the left and right!
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `My pony likes space on the left and right!`
    )
  })

  it(`excerpt has spaces between paragraphs`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      My pony is little.

      Little is my pony.
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`My pony is little. Little is my pony.`)
  })

  it(`excerpt has spaces between headings`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # Ponies: The Definitive Guide

      # What time is it?

      It's pony time.
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `Ponies: The Definitive Guide What time is it? It's pony time.`
    )
  })

  it(`excerpt has spaces between table cells`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      | Pony           | Owner    |
      | -------------- | -------- |
      | My Little Pony | Me, Duh  |
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`Pony Owner My Little Pony Me, Duh`)
  })

  it(`excerpt converts linebreaks into spaces`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      If my pony ain't broke,${`  `}
      don't fix it.
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(`If my pony ain't broke, don't fix it.`)
  })

  it(`excerpt does not have more than one space between elements`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # Pony express

      [some-link]: https://pony.my

      Pony express had nothing on my little pony.
      `
    const query = `
      {
        markdownRemark {
          excerpt
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `Pony express Pony express had nothing on my little pony.`
    )
  })

  it(`given raw html in the text body, this html is not escaped`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where is my <code>pony</code> named leo?
      `
    const query = `
      {
        markdownRemark {
          excerpt(format: HTML)
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `<p>Where is my <code>pony</code> named leo?</p>`
    )
  })

  it(`given an html format, it prunes large excerpts`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is that pony? Is he in the stable or down by the stream?
      `
    const query = `
      {
        markdownRemark {
          excerpt(format: HTML, pruneLength: 50)
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `<p>Where is my <code>pony</code> named leo?</p>`
    )
  })

  it(`given an html format, it respects the excerpt_separator`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is that *pony*? Is he in the stable or by the stream?

      <!-- end -->
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.
      `
    const query = `
      {
        markdownRemark {
          excerpt(format: HTML, pruneLength: 50)
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: { excerpt_separator: `<!-- end -->` },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.excerpt).toBe(
      `<p>Where oh where is that <em>pony</em>? Is he in the stable or by the stream?</p>\n`
    )
  })
})

describe(`Wordcount and timeToRead`, () => {
  it(`correctly uses wordCount parameters`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      Where oh where is my little pony? Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi auctor sit amet velit id facilisis. Nulla viverra, eros at efficitur pulvinar, lectus orci accumsan nisi, eu blandit elit nulla nec lectus. Integer porttitor imperdiet sapien. Quisque in orci sed nisi consequat aliquam. Aenean id mollis nisi. Sed auctor odio id erat facilisis venenatis. Quisque posuere faucibus libero vel fringilla.

      In quis lectus sed eros efficitur luctus. Morbi tempor, nisl eget feugiat tincidunt, sem velit vulputate enim, nec interdum augue enim nec mauris. Nulla iaculis ante sed enim placerat pretium. Nulla metus odio, facilisis vestibulum lobortis vitae, bibendum at nunc. Donec sit amet efficitur metus, in bibendum nisi. Vivamus tempus vel turpis sit amet auctor. Maecenas luctus vestibulum velit, at sagittis leo volutpat quis. Praesent posuere nec augue eget sodales. Pellentesque vitae arcu ut est varius venenatis id maximus sem. Curabitur non consectetur turpis.
      `
    const query = `
      {
        markdownRemark {
          wordCount {
            words
            paragraphs
            sentences
          }
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.wordCount).toEqual({
      paragraphs: 2,
      sentences: 19,
      words: 150,
    })
  })

  it(`correctly uses a default value for wordCount`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---
      `
    const query = `
      {
        markdownRemark {
          wordCount {
            words
            paragraphs
            sentences
          }
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.wordCount).toEqual({
      paragraphs: null,
      sentences: null,
      words: null,
    })
  })

  it(`correctly uses a default value for timeToRead`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---
      `
    const query = `
      {
        markdownRemark {
          timeToRead
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.timeToRead).toBe(1)
  })
})

describe(`Table of contents`, () => {
  it(`returns null on non existing table of contents field`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # first title

      some text

      ## second title

      some other text
      `
    const query = `
      {
        markdownRemark {
          tableOfContents
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.tableOfContents).toBe(null)
  })

  it(`correctly generates table of contents`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # first title

      some text

      ## second title

      some other text

      # third title

      final text
      `
    const query = `
      {
        markdownRemark {
          tableOfContents(pathToSlugField: "frontmatter.title")
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    // expect(markdownRemark.tableOfContents).toBe(``)
  })

  it(`table of contents is generated with correct depth (graphql option)`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # first title

      some text

      ## second title

      some other text
      `
    const query = `
      {
        markdownRemark {
          tableOfContents(pathToSlugField: "frontmatter.title", maxDepth: 1)
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.tableOfContents).toBe(`
      <ul>
        <li><a href="/my%20little%20pony/#first-title">first title</a></li>
      </ul>
    `)
  })

  it(`table of contents is generated with correct depth (plugin option)`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # first title

      some text

      ## second title

      some other text
      `
    const query = `
      {
        markdownRemark {
          tableOfContents(pathToSlugField: "frontmatter.title")
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: {
        tableOfContents: {
          maxDepth: 1,
        },
      },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.tableOfContents).toBe(`
      <ul>
        <li><a href="/my%20little%20pony/#first-title">first title</a></li>
      </ul>
    `)
  })

  it(`table of contents is generated from given heading onwards`, async () => {
    const markdown = strip`
      ---
      title: "my little pony"
      date: "2017-09-18T23:19:51.246Z"
      ---

      # first title

      some text

      ## second title

      some other text

      # third title

      final text
      `
    const query = `
      {
        markdownRemark {
          tableOfContents(pathToSlugField: "frontmatter.title", heading: "first title")
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: {
        tableOfContents: {
          maxDepth: 1,
        },
      },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.tableOfContents).toBe(`
      <ul>
        <li><a href="/my%20little%20pony/#third-title">third title</a></li>
      </ul>
    `)
  })
})

describe(`Prefixing links`, () => {
  it(`relative links are not prefixed`, async () => {
    const assetPrefix = ``
    const basePath = `/prefix`
    const pathPrefix = assetPrefix + basePath

    const markdown = strip`
      This is [a link](path/to/page1).

      This is [a reference]

      [a reference]: ./path/to/page2
      `
    const query = `
      {
        markdownRemark {
          html
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: {
        pathPrefix,
        basePath,
      },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.html).toMatch(`<a href="path/to/page1">`)
    expect(markdownRemark.html).toMatch(`<a href="./path/to/page2">`)
  })

  it(`correctly prefixes links`, async () => {
    const assetPrefix = ``
    const basePath = `/prefix`
    const pathPrefix = assetPrefix + basePath

    const markdown = strip`
      This is [a link](/path/to/page1).

      This is [a reference]

      [a reference]: /path/to/page2
      `
    const query = `
      {
        markdownRemark {
          html
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: {
        pathPrefix,
        basePath,
      },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.html).toMatch(`<a href="/prefix/path/to/page1">`)
    expect(markdownRemark.html).toMatch(`<a href="/prefix/path/to/page2">`)
  })

  it(`correctly prefixes links with assetPrefix`, async () => {
    const assetPrefix = `https://example.com/assets`
    const basePath = `/prefix`
    const pathPrefix = assetPrefix + basePath

    const markdown = strip`
      This is [a link](/path/to/page1).

      This is [a reference]

      [a reference]: /path/to/page2
      `
    const query = `
      {
        markdownRemark {
          html
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
      options: {
        pathPrefix,
        basePath,
      },
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.html).toMatch(`<a href="/prefix/path/to/page1">`)
    expect(markdownRemark.html).toMatch(`<a href="/prefix/path/to/page2">`)
  })
})

describe(`Code blocks`, () => {
  it(`code block with language and meta`, async () => {
    const markdown = strip`
      \`\`\`js foo bar
      console.log('hello world')
      \`\`\`
      `
    const query = `
      {
        markdownRemark {
          htmlAst
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(
      markdownRemark.htmlAst.children[0].children[0].properties.className
    ).toEqual([`language-js`])
    expect(
      markdownRemark.htmlAst.children[0].children[0].properties.dataMeta
    ).toEqual(`foo bar`)
  })
})

describe(`Headings`, () => {
  it(`returns value`, async () => {
    const markdown = strip`
      # first title

      ## second title
      `
    const query = `
      {
        markdownRemark {
          headings {
            value
            depth
          }
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.headings).toEqual([
      {
        value: `first title`,
        depth: 1,
      },
      {
        value: `second title`,
        depth: 2,
      },
    ])
  })

  it(`returns value with inlineCode`, async () => {
    const markdown = strip`
      # first title

      ## \`second title\`
      `
    const query = `
      {
        markdownRemark {
          headings {
            value
            depth
          }
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.headings).toEqual([
      {
        value: `first title`,
        depth: 1,
      },
      {
        value: `second title`,
        depth: 2,
      },
    ])
  })

  it(`returns value with mixed text`, async () => {
    const markdown = strip`
      # An **important** heading with \`inline code\` and text
      `
    const query = `
      {
        markdownRemark {
          headings {
            value
            depth
          }
        }
      }
    `
    const { markdownRemark } = await runQuery({
      markdown,
      query,
    })
    expect(markdownRemark).toMatchSnapshot()
    expect(markdownRemark.headings).toEqual([
      {
        value: `An important heading with inline code and text`,
        depth: 1,
      },
    ])
  })
})
