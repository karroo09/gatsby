const { isValid, parseISO } = require(`date-fns`)

const isDate = string => isValid(parseISO(string))

module.exports = isDate
