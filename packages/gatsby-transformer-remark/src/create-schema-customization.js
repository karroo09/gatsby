const getTransformers = require(`./transformers`)

const getTypeDefs = ({ schema, pluginOptions }) => [
  `
    type MarkdownHeading {
      value: String
      depth: Int
    }

    enum MarkdownHeadingLevels {
      h1
      h2
      h3
      h4
      h5
      h6
    }

    enum MarkdownExcerptFormats {
      PLAIN
      HTML
      MARKDOWN
    }

    type MarkdownWordCount {
      paragraphs: Int
      sentences: Int
      words: Int
    }
  `,
  schema.buildObjectType({
    name: `MarkdownRemark`,
    interfaces: [`Node`],
    extensions: {
      infer: true,
      childOf: {
        mimeTypes: [`text/markdown`, `text/x-markdown`],
      },
    },
    fields: {
      excerpt: {
        type: `String!`,
        args: {
          pruneLength: {
            type: `Int!`,
            defaultValue: 140,
          },
          truncate: {
            type: `Boolean!`,
            defaultValue: false,
          },
          format: {
            type: `MarkdownExcerptFormats!`,
            defaultValue: `PLAIN`,
          },
        },
        resolve(source, args, context, info) {
          return context.transformerRemark.getExcerpt(
            source,
            {
              ...args,
              excerptSeparator: pluginOptions.excerpt_separator,
            },
            context,
            info
          )
        },
      },
      excerptAst: {
        type: `JSON!`,
        args: {
          pruneLength: {
            type: `Int!`,
            defaultValue: 140,
          },
          truncate: {
            type: `Boolean!`,
            defaultValue: false,
          },
        },
        resolve(source, args, context, info) {
          return context.transformerRemark.getExcerptAst(
            source,
            {
              ...args,
              excerptSeparator: pluginOptions.excerpt_separator,
            },
            context,
            info
          )
        },
      },
      headings: {
        type: `[MarkdownHeading!]!`,
        args: {
          depth: `MarkdownHeadingLevels`,
        },
        resolve(source, args, context, info) {
          return context.transformerRemark.getHeadings(
            source,
            args,
            context,
            info
          )
        },
      },
      html: {
        type: `String!`,
        resolve(source, args, context, info) {
          return context.transformerRemark.getHtml(source, args, context, info)
        },
      },
      htmlAst: {
        type: `JSON!`,
        resolve(source, args, context, info) {
          return context.transformerRemark.getHtmlAst(
            source,
            args,
            context,
            info
          )
        },
      },
      tableOfContents: {
        type: `String!`,
        args: {
          pathToSlugField: {
            type: `String!`,
            defaultValue: `fields.slug`,
          },
          maxDepth: `Int`,
          heading: `String`,
        },
        resolve(source, args, context, info) {
          return context.transformerRemark.getTableOfContents(
            source,
            args,
            context,
            info
          )
        },
      },
      timeToRead: {
        type: `Int!`,
        resolve(source, args, context, info) {
          return context.transformerRemark.getTimeToRead(
            source,
            args,
            context,
            info
          )
        },
      },
      wordCount: {
        type: `MarkdownWordCount`,
        resolve(source, args, context, info) {
          return context.transformerRemark.getWordCount(
            source,
            args,
            context,
            info
          )
        },
      },
    },
  }),
]

module.exports = (nodeApiArgs, pluginOptions = {}) => {
  const { plugins = [] } = pluginOptions
  const {
    actions,
    basePath,
    cache,
    getCache: possibleGetCache,
    pathPrefix,
    reporter,
    schema,
  } = nodeApiArgs

  // TODO: we should be able to get cache and reporter from context
  // TODO: just merge basePath into options
  // TODO: when to pass on args to context.transformerRemark.*?
  // TODO: get rid of graymatter and other stuff in onCreateNode
  // TODO: Future: put more stuff into the actual remark pipeline and retrieve it from vfile.date

  const safeGetCache = ({ getCache, cache }) => id => {
    if (!getCache) {
      return cache
    }
    return getCache(id)
  }
  const getCache = safeGetCache({ cache, getCache: possibleGetCache })

  actions.createResolverContext(
    getTransformers({
      cache,
      basePath,
      getCache,
      pathPrefix,
      pluginOptions,
      reporter,
    })
  )

  actions.createTypes(getTypeDefs({ schema, pluginOptions }))

  // This allows subplugins to use Node APIs bound to `gatsby-transformer-remark`
  // to customize the GraphQL schema. This makes it possible for subplugins to
  // modify types owned by `gatsby-transformer-remark`.
  plugins.forEach(plugin => {
    const resolvedPlugin = require(plugin.resolve)
    if (typeof resolvedPlugin.createSchemaCustomization === `function`) {
      resolvedPlugin.createSchemaCustomization(
        nodeApiArgs,
        plugin.pluginOptions
      )
    }
  })
}
