const getUniqueValues = require(`./get-unique-values`)

const buildSelection = key => ({
  kind: `Field`,
  name: { kind: `Name`, value: key },
  // selectionSet: undefined,
})

const buildSelectionSet = (selectionSet = {}, projectedFields) => {
  const currentSelections = selectionSet.selections || []
  const fieldNames = getUniqueValues(
    Object.keys(projectedFields).concat(
      currentSelections.map(selection => selection.name.value)
    )
  )

  const selections = fieldNames.map(fieldName => {
    const selection =
      currentSelections.find(s => s.name.value === fieldName) ||
      buildSelection(fieldName)
    const fields = projectedFields[fieldName]
    if (fields && typeof fields === `object` && Object.keys(fields).length) {
      selection.selectionSet = buildSelectionSet(selection.selectionSet, fields)
    }
    return selection
  })

  return selections.length ? { kind: `SelectionSet`, selections } : undefined
}

module.exports = buildSelectionSet
