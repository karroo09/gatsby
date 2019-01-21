const { isValid, parseISO } = require(`@stefanprobst/date-fns`)

const isDate = string => isValid(parseISO(string))

module.exports = isDate
