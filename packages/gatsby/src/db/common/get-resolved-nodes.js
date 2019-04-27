const { getNullableType } = require(`graphql`)
const { trackInlineObjectsInRootNode } = require(`../node-tracking`)
const withResolverContext = require(`../../schema/context`)

const resolveValue = (value, filterValue, type, context, schema) => {
  const nullableType = getNullableType(type)
  // return Array.isArray(value) && nullableType instanceof GraphQLList
  return Array.isArray(value)
    ? Promise.all(
        value.map(item =>
          resolveValue(item, filterValue, nullableType.ofType, context, schema)
        )
      )
    : resolveNode(value, filterValue, nullableType, context, schema)
}

const resolveNode = (node, filter, parentType, context, schema) => {
  const fields = parentType.getFields()

  const queryNode = Object.keys(filter).reduce(
    async (acc, fieldName) => {
      const filterValue = filter[fieldName]
      const node = await acc

      const { type, args, resolve } = fields[fieldName]

      if (typeof resolve === `function`) {
        const defaultValues = args.reduce((acc, { name, defaultValue }) => {
          acc[name] = defaultValue
          return acc
        }, {})
        node[fieldName] = await resolve(node, defaultValues, context, {
          fieldName,
          parentType,
          returnType: type,
          schema,
        })
      }

      // `dropQueryOperators` sets value to `true` for leaf values.
      const isLeaf = filterValue === true
      const value = node[fieldName]

      if (!isLeaf && value != null) {
        node[fieldName] = await resolveValue(
          value,
          filterValue,
          type,
          context,
          schema
        )
      }

      return node
    },
    { ...node }
  )
  return queryNode
}

const getResolvedNodes = async ({ nodes, type, fields, schema }) => {
  const nodesToProcess = await nodes
  const context = withResolverContext({})
  return Promise.all(
    nodesToProcess.map(async node => {
      const resolvedNode = resolveNode(node, fields, type, context, schema)
      trackInlineObjectsInRootNode(await resolvedNode)
      return resolvedNode
    })
  )
}

module.exports = { getResolvedNodes }
