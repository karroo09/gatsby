const buildSelectionSet = require(`../build-selection-set`)

describe(`buildSelectionSet util`, () => {
  it(`adds projection fields to selection set`, () => {
    const selectionSet = {
      kind: `SelectionSet`,
      selections: [
        {
          kind: `Field`,
          name: { kind: `Name`, value: `first` },
          selectionSet: undefined,
        },
        {
          kind: `Field`,
          name: { kind: `Name`, value: `second` },
          selectionSet: {
            kind: `SelectionSet`,
            selections: [
              {
                kind: `Field`,
                name: { kind: `Name`, value: `first` },
                selectionSet: undefined,
              },
            ],
          },
        },
        {
          kind: `Field`,
          name: { kind: `Name`, value: `third` },
          selectionSet: {
            kind: `SelectionSet`,
            selections: [
              {
                kind: `Field`,
                name: { kind: `Name`, value: `first` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `second` },
                      selectionSet: undefined,
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    }

    const projection = {
      fourth: true,
      third: {
        first: {
          first: true,
          second: true,
        },
        second: true,
        third: {
          first: true,
        },
      },
    }

    const expected = {
      kind: `SelectionSet`,
      selections: [
        {
          kind: `Field`,
          name: { kind: `Name`, value: `fourth` },
          selectionSet: undefined,
        },
        {
          kind: `Field`,
          name: { kind: `Name`, value: `third` },
          selectionSet: {
            kind: `SelectionSet`,
            selections: [
              {
                kind: `Field`,
                name: { kind: `Name`, value: `first` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `first` },
                      selectionSet: undefined,
                    },
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `second` },
                      selectionSet: undefined,
                    },
                  ],
                },
              },
              {
                kind: `Field`,
                name: { kind: `Name`, value: `second` },
                selectionSet: undefined,
              },
              {
                kind: `Field`,
                name: { kind: `Name`, value: `third` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `first` },
                      selectionSet: undefined,
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          kind: `Field`,
          name: { kind: `Name`, value: `first` },
          selectionSet: undefined,
        },
        {
          kind: `Field`,
          name: { kind: `Name`, value: `second` },
          selectionSet: {
            kind: `SelectionSet`,
            selections: [
              {
                kind: `Field`,
                name: { kind: `Name`, value: `first` },
                selectionSet: undefined,
              },
            ],
          },
        },
      ],
    }

    const result = buildSelectionSet(selectionSet, projection)
    expect(result).toEqual(expected)
  })
})
