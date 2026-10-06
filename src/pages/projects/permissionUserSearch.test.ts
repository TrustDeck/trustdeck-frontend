import { describe, expect, it } from 'vitest'

import type { PersonSuggestion } from './types/Permission'
import {
  hasNoPersonSearchResults,
  initialPermissionUserSearchState,
  permissionUserSearchReducer,
  trimPersonSearchQuery
} from './permissionUserSearch'

const returnedPerson: PersonSuggestion = {
  userId: 'user-1',
  username: 'returned-user',
  name: 'Returned User'
}

function stateAfterResult(requestId = 1) {
  let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
    type: 'queryChanged',
    value: ' returned-user ',
    requestId
  })
  state = permissionUserSearchReducer(state, {
    type: 'searchStarted',
    requestId
  })
  return permissionUserSearchReducer(state, {
    type: 'searchSucceeded',
    requestId,
    suggestions: [returnedPerson]
  })
}

describe('permission user search state', () => {
  it('does not search blank or whitespace-only input', () => {
    expect(trimPersonSearchQuery('')).toBeNull()
    expect(trimPersonSearchQuery('   ')).toBeNull()
  })

  it('submits the trimmed search query', () => {
    expect(trimPersonSearchQuery('  returned-user  ')).toBe('returned-user')
  })

  it('does not select a person from arbitrary typed input', () => {
    const state = permissionUserSearchReducer(
      initialPermissionUserSearchState,
      { type: 'queryChanged', value: 'arbitrary-user-id', requestId: 1 }
    )

    expect(state.selectedPerson).toBeNull()
  })

  it('only selects a person returned in the suggestions', () => {
    const state = stateAfterResult()
    const arbitraryPerson = {
      ...returnedPerson,
      userId: 'not-returned'
    }

    expect(
      permissionUserSearchReducer(state, {
        type: 'personSelected',
        person: arbitraryPerson
      }).selectedPerson
    ).toBeNull()
    expect(
      permissionUserSearchReducer(state, {
        type: 'personSelected',
        person: returnedPerson
      }).selectedPerson
    ).toBe(returnedPerson)
  })

  it('clears an existing selection when the query is edited', () => {
    const selectedState = permissionUserSearchReducer(stateAfterResult(), {
      type: 'personSelected',
      person: returnedPerson
    })
    const editedState = permissionUserSearchReducer(selectedState, {
      type: 'queryChanged',
      value: 'different-user',
      requestId: 2
    })

    expect(editedState.selectedPerson).toBeNull()
    expect(editedState.suggestions).toEqual([])
  })

  it('clears the query, suggestions, and selection', () => {
    const state = permissionUserSearchReducer(
      permissionUserSearchReducer(stateAfterResult(), {
        type: 'personSelected',
        person: returnedPerson
      }),
      { type: 'cleared', requestId: 2 }
    )

    expect(state.query).toBe('')
    expect(state.suggestions).toEqual([])
    expect(state.selectedPerson).toBeNull()
  })

  it('does not let an older response replace a newer result', () => {
    let state = stateAfterResult(1)
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 2
    })
    const olderResponse = permissionUserSearchReducer(state, {
      type: 'searchSucceeded',
      requestId: 1,
      suggestions: [returnedPerson]
    })

    expect(olderResponse).toBe(state)
  })

  it('represents a successful zero-result response as no users found', () => {
    let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
      type: 'queryChanged',
      value: 'missing-user',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchSucceeded',
      requestId: 1,
      suggestions: []
    })

    expect(hasNoPersonSearchResults(state)).toBe(true)
  })
})
