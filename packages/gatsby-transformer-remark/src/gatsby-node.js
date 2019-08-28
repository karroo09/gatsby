const { createSchemaCustomization } = require(`./create-schema-customization`)
const { onCreateNode } = require(`./on-create-node`)

module.exports = {
  createSchemaCustomization,
  onCreateNode,
}
