const { merge, pathToObject } = require(`../utils`)
const { dropQueryOperators } = require(`../query`)

const getQueryFields = rp => {
  const { filter, sort } = rp.args || {}
  const { group, distinct } = rp.projection || {}

  const filterFields = filter ? dropQueryOperators(filter) : {}
  const sortFields = (sort && sort.fields) || []

  const fields = merge(
    filterFields,
    ...sortFields.map(pathToObject),
    pathToObject(group),
    pathToObject(distinct)
  )

  return fields
}

module.exports = getQueryFields
