const _ = require(`lodash`)
const fs = require(`fs-extra`)
const path = require(`path`)
const stringify = require(`json-stringify-safe`)

const toMap = array => new Map(array)
const toArray = map => Array.from(map)

const jsonParse = buffer => {
  const parsed = JSON.parse(buffer.toString(`utf8`))
  parsed.staticQueryComponents = toMap(parsed.staticQueryComponents)
  parsed.components = toMap(parsed.components)
  return parsed
}

const jsonStringify = contents => {
  contents.staticQueryComponents = toArray(contents.staticQueryComponents)
  contents.components = toArray(contents.components)
  return stringify(contents, null, 2)
}

const [deserialize, serialize, fileName] = [
  jsonParse,
  jsonStringify,
  path.join(process.cwd(), `.cache/redux-state.json`),
]

const loadState = () => {
  let initialState = {}
  if (fs.existsSync(fileName)) {
    try {
      initialState = deserialize(fs.readFileSync(fileName))
    } catch (err) {
      const report = require(`gatsby-cli/lib/reporter`)
      report.warn(`Error loading state: ${(err && err.message) || err}`)
    }
  }
  return initialState
}

const saveReduxState = state => {
  const pickedState = _.pick(state, [
    `status`,
    `componentDataDependencies`,
    `jsonDataPaths`,
    `components`,
    `staticQueryComponents`,
  ])
  return fs.writeFile(fileName, serialize(pickedState))
}

let saveInProgress = false
const saveState = async state => {
  if (process.env.DANGEROUSLY_DISABLE_OOM) {
    return Promise.resolve()
  }

  if (saveInProgress) return Promise.resolve()

  saveInProgress = true
  try {
    // FIXME: Where to save nodes db
    await Promise.all([saveReduxState(state), state.nodes.db.saveState()])
  } catch (err) {
    const report = require(`gatsby-cli/lib/reporter`)
    report.warn(`Error persisting state: ${(err && err.message) || err}`)
  }
  saveInProgress = false
}

const saveStateDebounced = _.debounce(saveState, 1000)

module.exports = {
  loadState,
  saveState: saveStateDebounced,
}
