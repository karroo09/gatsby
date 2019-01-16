const pathToObject = path => {
  if (path && typeof path === `string`) {
    return path.split(`.`).reduceRight((acc, key) => ({ [key]: acc }), true)
  }
  return {}
}

module.exports = pathToObject
