// const { assertValidName } = require(`graphql`)

// const createFieldName = str => {
//   const name = str.replace(/^\d|[^\w]/g, `_`)
//   assertValidName(name)

//   return name
// }

const invariant = require(`invariant`)

const createFieldName = str => {
  const name = str.replace(/[^\w]/g, `_`)

  invariant(
    typeof str === `string`,
    `GraphQL field name ${str} is not a string.`
  )

  if (name.match(/^__/)) {
    return name.replace(/_/g, (char, index) => (index === 0 ? `_` : `x`))
  }

  if (name.match(/^\d/)) {
    return `_` + name
  }

  return name
}

module.exports = createFieldName
