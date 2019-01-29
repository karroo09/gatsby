// const { toInputObjectType } = require(`graphql-compose`)

const getFilterInput = require(`./filter`)
const getSortInput = require(`./sort`)

// FIXME: UPSTREAM: graphql-compose:toInputObjectType
// * either allow passing cache instance to getITC, not only to
//   toInputObjectType, or call getITC instead of toInputObjectType
//   in convertInputObjectField so that the itc gets stuck on the tc.
// * no need to prefix input types in toInputObjectType, since typenames
//   should already be unique.
// * allow option to drop type modifiers, since types are already being
//   unwrapped

// const cache = new Map()

const getInputArgs = tc => {
  // const itc = toInputObjectType(tc, {}, cache)
  const itc = tc.getITC()

  const FilterInputTC = getFilterInput(itc)
  const [SortInputTC, FieldsEnumTC] = getSortInput(itc)
  return [FilterInputTC, SortInputTC, FieldsEnumTC]
}

module.exports = {
  getInputArgs,
}
