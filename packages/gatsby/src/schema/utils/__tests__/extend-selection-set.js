const extendSelectionSet = require(`../extend-selection-set`)

describe(`extendSelectionSet util`, () => {
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
                name: { kind: `Name`, value: `second_first` },
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
                name: { kind: `Name`, value: `third_first` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `third_first_first` },
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
      third: {
        third_first: {
          third_first_first: true,
          third_first_second: true,
        },
        third_second: true,
        third_third: {
          third_third_first: true,
        },
      },
      fourth: true,
    }

    const expected = {
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
                name: { kind: `Name`, value: `second_first` },
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
                name: { kind: `Name`, value: `third_first` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `third_first_first` },
                      selectionSet: undefined,
                    },
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `third_first_second` },
                      selectionSet: undefined,
                    },
                  ],
                },
              },
              {
                kind: `Field`,
                name: { kind: `Name`, value: `third_second` },
                selectionSet: undefined,
              },
              {
                kind: `Field`,
                name: { kind: `Name`, value: `third_third` },
                selectionSet: {
                  kind: `SelectionSet`,
                  selections: [
                    {
                      kind: `Field`,
                      name: { kind: `Name`, value: `third_third_first` },
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
          name: { kind: `Name`, value: `fourth` },
          selectionSet: undefined,
        },
      ],
    }

    extendSelectionSet(selectionSet, projection)
    // NOTE: selectionSet is mutated on purpose
    expect(selectionSet).toEqual(expected)
  })
})
