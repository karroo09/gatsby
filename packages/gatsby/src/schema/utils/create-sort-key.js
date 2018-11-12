// const toSnakeCase = require(`./to-snake-case`)

const createSortKey = (key, delimiter) =>
  key &&
  key
    .split(`.`)
    // .map(toSnakeCase)
    .join(delimiter)
// FIXME: Enum values should be uppercase
// .toUpperCase()

module.exports = createSortKey
