const getFilterInput = require(`./filter`)
const getSortInput = require(`./sort`)

const getInputArgs = tc => {
  tc.removeInputTypeComposer()
  const itc = tc.getITC()

  const FilterInputTC = getFilterInput(itc)
  const [SortInputTC, FieldsEnumTC] = getSortInput(itc)
  return [FilterInputTC, SortInputTC, FieldsEnumTC]
}

module.exports = {
  getInputArgs,
}
