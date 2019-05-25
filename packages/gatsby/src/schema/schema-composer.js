const { SchemaComposer, GraphQLJSON } = require(`graphql-compose`)
const { getNodeInterface } = require(`./types/node-interface`)
const { GraphQLDate } = require(`./types/date`)
const { addDirectives } = require(`./extensions`)

const createSchemaComposer = ({ fieldExtensions } = {}) => {
  const schemaComposer = new SchemaComposer()
  getNodeInterface({ schemaComposer })
  schemaComposer.addAsComposer(GraphQLDate)
  schemaComposer.addAsComposer(GraphQLJSON)
  addDirectives({ schemaComposer, fieldExtensions })
  return schemaComposer
}

module.exports = { createSchemaComposer }
