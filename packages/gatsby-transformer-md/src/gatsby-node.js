const graymatter = require(`gray-matter`)
const retext = require(`retext`)
const unified = require(`unified`)
const markdown = require(`remark-parse`)
const toHast = require(`remark-rehype`)
const html = require(`rehype-stringify`)
const { getValueAt } = require(`gatsby/dist/schema/utils/get-value-at`)

exports.onCreateNode = async (
  { actions, createContentDigest, createNodeId, loadNodeContent, node },
  options
) => {
  const { mediaType } = node.internal
  if (mediaType !== `text/markdown` && mediaType !== `text/x-markdown`) {
    return
  }

  const { createNode, createParentChildLink } = actions

  const md = await loadNodeContent(node)

  const { data: frontmatter, content } = graymatter(md, options)

  const markdownNode = {
    id: createNodeId(`Markdown from ${node.id}`),
    parent: node.id,
    children: [],
    internal: {
      type: `Markdown`,
      contentDigest: createContentDigest(md),
      content,
    },
    frontmatter,
  }

  createNode(markdownNode)
  createParentChildLink({
    parent: node,
    child: markdownNode,
  })
}

const preprocessor = retext()

const processor = unified()
  .use(markdown)
  .use(toHast)
  .use(html)

exports.createSchemaCustomization = ({ actions, pathPrefix }, options) => {
  const { createTypes, createFieldExtension } = actions

  createFieldExtension({
    name: `md`,
    extend() {
      return {
        type: `String`,
        async resolve(source, args, context, info) {
          const fieldValue = getValueAt(source, info.fieldName)
          const preprocessed = await preprocessor.process(fieldValue)
          const processed = await processor.process(preprocessed.contents)
          return processed.contents
        },
      }
    },
  })

  createTypes(`
    type Markdown implements Node {
      html: String @md @proxy(from: "internal.content")
    }
  `)
}
