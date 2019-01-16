const { TypeComposer } = require(`graphql-compose`)
const { getNullableType } = require(`graphql`)

const { getValueAtSelector, getUniqueValues, isDefined } = require(`../utils`)

const distinct = (source, args, context, info) => {
  const { field } = args
  const { items } = source
  const values = items.reduce((acc, node) => {
    const value = getValueAtSelector(node, field)
    return value != null ? acc.concat(value) : acc
  }, [])
  return getUniqueValues(values).sort()
}

const group = (source, args, context, info) => {
  const { field } = args
  const { items } = source
  const groupedResults = items.reduce((acc, node) => {
    const value = getValueAtSelector(node, field)
    const values = Array.isArray(value) ? value : [value]
    values
      .filter(isDefined)
      .forEach(v => (acc[v] = (acc[v] || []).concat(node)))
    return acc
  }, {})
  return Object.keys(groupedResults)
    .sort()
    .reduce((acc, fieldValue) => {
      acc.push({
        ...paginate(groupedResults[fieldValue], args),
        field,
        fieldValue,
      })
      return acc
    }, [])
}

const paginate = (results, { skip = 0, limit }) => {
  const count = results.length
  const items = results.slice(skip, limit && skip + limit)

  const pageCount = limit
    ? Math.ceil(skip / limit) + Math.ceil((count - skip) / limit)
    : skip
    ? 2
    : 1
  const currentPage = limit ? Math.ceil(skip / limit) + 1 : skip ? 2 : 1 // Math.min(currentPage, pageCount)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = skip + limit < count // currentPage < pageCount

  return {
    count: items.length,
    items,
    pageInfo: {
      currentPage,
      hasNextPage,
      hasPreviousPage,
      itemCount: count,
      pageCount,
      perPage: limit,
    },
  }
}

const PageInfoTC = TypeComposer.create({
  name: `PageInfo`,
  fields: {
    currentPage: `Int`,
    hasNextPage: `Boolean`,
    hasPreviousPage: `Boolean`,
    itemCount: `Int`,
    pageCount: `Int`,
    perPage: `Int`,
  },
})

const createPaginationTC = (tc, fields, name) =>
  TypeComposer.create({
    name,
    fields: {
      count: `Int`,
      items: [tc],
      pageInfo: PageInfoTC,
      ...fields,
    },
  })

const getGroupTC = tc => {
  const typeName = tc.getTypeName() + `GroupConnection`
  const fields = {
    field: `String`,
    fieldValue: `String`,
  }
  return createPaginationTC(tc, fields, typeName)
}

const getPaginationTC = (tc, FieldsEnumTC) => {
  const typeName = tc.getTypeName() + `Connection`
  const fields = {
    distinct: {
      type: [`String`],
      args: {
        field: FieldsEnumTC.getTypeNonNull(),
      },
      resolve: distinct,
    },
    group: {
      type: [getGroupTC(tc)],
      args: {
        skip: `Int`,
        limit: `Int`,
        field: FieldsEnumTC.getTypeNonNull(),
      },
      resolve: group,
    },
  }
  return createPaginationTC(tc, fields, typeName)
}

const getProjectedField = (info, fieldName) => {
  const { selections } = info.fieldNodes[0].selectionSet
  const selection = selections.find(s => s.name.value === fieldName)
  const fieldArg = selection.arguments.find(arg => arg.name.value === `field`)
  const enumKey = fieldArg.value.value
  const Enum = getNullableType(
    info.returnType
      .getFields()
      [fieldName].args.find(arg => arg.name === `field`).type
  )
  return Enum.getValue(enumKey).value
}

module.exports = { paginate, getPaginationTC, getProjectedField }
