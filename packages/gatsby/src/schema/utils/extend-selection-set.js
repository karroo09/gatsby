const getUniqueValues = require(`./get-unique-values`)

const createSelection = key => ({
  kind: `Field`,
  name: { kind: `Name`, value: key },
  selectionSet: undefined,
})

// TODO: Clean this up a bit
const extendSelectionSet = (selectionSet, projectedFields) => {
  const selections = selectionSet.selections
  const fieldNames = getUniqueValues(
    Object.keys(projectedFields).concat(
      selections.map(selection => selection.name.value)
    )
  )
  fieldNames.forEach(fieldName => {
    let selection
    selection = selections.find(s => s.name.value === fieldName)
    if (!selection) {
      selection = createSelection(fieldName)
      selections.push(selection)
    }

    const fields = projectedFields[fieldName]
    if (typeof fields === `object` && fields && Object.keys(fields).length) {
      if (!selection.selectionSet) {
        selection.selectionSet = { kind: `SelectionSet`, selections: [] }
      }
      extendSelectionSet(selection.selectionSet, fields)
    }
  })

  if (!selections.length) {
    selectionSet = undefined
  }
}

module.exports = extendSelectionSet
