const { getNamedType } = require(`graphql`)

const hasResolvers = (type, filterFields) => {
  const fields = type.getFields()
  return Object.entries(filterFields).some(([fieldName, filterValue]) => {
    const field = fields[fieldName]
    return (
      Boolean(field.resolve) ||
      (filterValue !== true &&
        hasResolvers(getNamedType(field.type), filterValue))
    )
  })
}

module.exports = hasResolvers
