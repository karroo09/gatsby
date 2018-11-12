const withBaseDir = require(`../with-base-dir`)

describe(`withBaseDir util`, () => {
  it(`joins a path to a base dir`, () => {
    const baseDir = `foo/bar/baz`
    const withDir = withBaseDir(baseDir)
    const path = `../foo/bar.txt`
    const expected = `foo/bar/foo/bar.txt`
    expect(withDir(path)).toBe(expected)
  })

  it(`joins a Windows path to a base dir`, () => {
    const baseDir = `foo/bar/baz`
    const withDir = withBaseDir(baseDir)
    const path = `..\\foo\\bar.txt`
    const expected = `foo/bar/foo/bar.txt`
    expect(withDir(path)).toBe(expected)
  })

  it(`joins a path to a slashed Windows base dir`, () => {
    const baseDir = `C:/foo/bar/baz`
    const withDir = withBaseDir(baseDir)
    const path = `../foo/bar.txt`
    const expected = `C:/foo/bar/foo/bar.txt`
    expect(withDir(path)).toBe(expected)
  })

  it(`joins a Windows path to a slashed Windows base dir`, () => {
    const baseDir = `C:/foo/bar/baz`
    const withDir = withBaseDir(baseDir)
    const path = `..\\foo\\bar.txt`
    const expected = `C:/foo/bar/foo/bar.txt`
    expect(withDir(path)).toBe(expected)
  })
})
