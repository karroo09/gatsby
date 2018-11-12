const capitalize = require(`./capitalize`)

const createTypeName = selector => {
  const key = selector
    .split(`.`)
    .map(capitalize)
    .join(``)

  return key
}

module.exports = createTypeName
