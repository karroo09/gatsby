const {
  schemaComposer,
  InterfaceTypeComposer,
  TypeComposer,
} = require(`graphql-compose`)

const { findById, findByIds } = require(`../resolvers`)

// TODO: why is `mediaType` on Internal? Applies only to File!?
// FIXME: `fieldOwners` is an Object (fieldName=>pluginName Map), not an array
const InternalTC = TypeComposer.create({
  name: `Internal`,
  fields: {
    content: `String`,
    contentDigest: `String`,
    description: `String`,
    fieldOwners: [`String`],
    ignoreType: `Boolean`,
    mediaType: `String`,
    owner: `String`,
    type: `String!`,
  },
})

const NodeInterfaceTC = InterfaceTypeComposer.create({
  name: `Node`,
  description: `Node Interface`,
  fields: {
    id: `ID!`,
    parent: {
      type: `Node`,
      resolve: async (source, args, context, info) =>
        findById({ source, args: { id: source.parent }, context, info }),
    },
    children: {
      type: `[Node]!`,
      resolve: async (source, args, context, info) =>
        findByIds({ source, args: { ids: source.children }, context, info }),
    },
    internal: `Internal`,
  },
})

NodeInterfaceTC.setResolveType(node => node.internal.type)

InternalTC.getITC()
NodeInterfaceTC.getITC()

const addNodeInterface = tc => {
  tc.addInterface(NodeInterfaceTC.getType())
  addNodeInterfaceFields(tc)
}

const addNodeInterfaceFields = tc => {
  tc.addFields(NodeInterfaceTC.getFields())
  const typeName = tc.getTypeName()
  tc.setIsTypeOf(node => node.internal.type === typeName)
  // FIXME: UPSTREAM: addSchemaMustHaveType adds to an array,
  // should be Set/Map to avoid duplicates?
  schemaComposer.addSchemaMustHaveType(tc)
}

const getNodeInterfaceFields = () => NodeInterfaceTC.getFieldNames()

module.exports = {
  addNodeInterface,
  addNodeInterfaceFields,
  getNodeInterfaceFields,
}
