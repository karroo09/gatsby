const { assertValidName } = require(`graphql`)

const createFieldName = str => {
  const name = str.replace(/^\d|[^\w]/g, `_`)
  assertValidName(name)

  return name
}

module.exports = createFieldName
