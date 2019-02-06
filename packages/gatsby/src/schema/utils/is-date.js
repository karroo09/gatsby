const moment = require(`moment`)

const ISO_8601_FORMAT = [
  `YYYY`,
  `YYYY-MM`,
  `YYYY-MM-DD`,
  `YYYYMMDD`,

  // Local Time
  `YYYY-MM-DDTHH`,
  `YYYY-MM-DDTHH:mm`,
  `YYYY-MM-DDTHHmm`,
  `YYYY-MM-DDTHH:mm:ss`,
  `YYYY-MM-DDTHHmmss`,
  `YYYY-MM-DDTHH:mm:ss.SSS`,
  `YYYY-MM-DDTHHmmss.SSS`,

  // Coordinated Universal Time (UTC)
  `YYYY-MM-DDTHHZ`,
  `YYYY-MM-DDTHH:mmZ`,
  `YYYY-MM-DDTHHmmZ`,
  `YYYY-MM-DDTHH:mm:ssZ`,
  `YYYY-MM-DDTHHmmssZ`,
  `YYYY-MM-DDTHH:mm:ss.SSSZ`,
  `YYYY-MM-DDTHHmmss.SSSZ`,

  `YYYY-[W]WW`,
  `YYYY[W]WW`,
  `YYYY-[W]WW-E`,
  `YYYY[W]WWE`,
  `YYYY-DDDD`,
  `YYYYDDDD`,
]

const isDate = string => {
  const momentDate = moment.utc(string, ISO_8601_FORMAT, true)
  return momentDate.isValid() && typeof value !== `number`
}

module.exports = { isDate, ISO_8601_FORMAT }
