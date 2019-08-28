const grayMatter = require(`gray-matter`)
const { isDate } = require(`lodash`)

const createMarkdownNode = ({
  createContentDigest,
  createNodeId,
  markdown,
  options,
  parent,
}) => {
  const { excerpt, data: rawFrontmatter = {}, content } = grayMatter(
    markdown,
    options
  )

  const frontmatter = Object.entries(rawFrontmatter).reduce(
    (acc, [key, value]) => {
      acc[key] = isDate(value) ? value.toISOString() : value
      return acc
    },
    {}
  )

  const markdownNode = {
    id: createNodeId(`${parent.id} >>> MarkdownRemark`),
    parent: parent.id,
    children: [],
    internal: {
      type: `MarkdownRemark`,
      content,
      contentDigest: createContentDigest(markdown),
    },
    excerpt,
    frontmatter: {
      title: ``, // always include a title
      ...frontmatter,
    },
    // @deprecated
    rawMarkdownBody: content,
  }

  // @deprecated
  if (parent.internal.type === `File`) {
    markdownNode.fileAbsolutePath = parent.absolutePath
  }

  return markdownNode
}

const onCreateNode = async (
  {
    actions,
    createContentDigest,
    createNodeId,
    loadNodeContent,
    node,
    reporter,
  },
  options
) => {
  if (
    node.internal.mediaType !== `text/markdown` &&
    node.internal.mediaType !== `text/x-markdown`
  ) {
    return
  }

  const markdown = await loadNodeContent(node)

  try {
    const markdownNode = createMarkdownNode({
      createContentDigest,
      createNodeId,
      markdown,
      options,
      parent: node,
    })

    actions.createNode(markdownNode)
    actions.createParentChildLink({ parent: node, child: markdownNode })
  } catch (err) {
    reporter.panicOnBuild(
      `Error processing Markdown ${
        node.absolutePath ? `file ${node.absolutePath}` : `in node ${node.id}`
      }:\n
      ${err.message}`
    )
  }
}

module.exports = {
  createMarkdownNode,
  onCreateNode,
}
