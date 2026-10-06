import { describe, expect, it } from 'vitest'

import type { PersonSuggestion } from './types/Permission'
import {
  formatPersonSuggestionName,
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

const serviceAccount: PersonSuggestion = {
  userId: 'keycloak-service-account-id',
  username: 'service-account-trustdeck-kafka-connector',
  name: 'service-account-trustdeck-kafka-connector'
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

  it('uses a username when a service account has no name fields', () => {
    expect(
      formatPersonSuggestionName({
        username: serviceAccount.username,
        firstName: null,
        lastName: null
      })
    ).toBe(serviceAccount.username)
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

  it('ignores a pending response after the query is edited', () => {
    let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
      type: 'queryChanged',
      value: 'first-query',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'queryChanged',
      value: 'second-query',
      requestId: 2
    })

    expect(
      permissionUserSearchReducer(state, {
        type: 'searchSucceeded',
        requestId: 1,
        suggestions: [returnedPerson]
      })
    ).toBe(state)
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

  it('ignores a pending response after the field is cleared', () => {
    let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
      type: 'queryChanged',
      value: 'returned-user',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'cleared',
      requestId: 2
    })

    expect(
      permissionUserSearchReducer(state, {
        type: 'searchSucceeded',
        requestId: 1,
        suggestions: [returnedPerson]
      })
    ).toBe(state)
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

  it('allows a new search to start while an older search is pending', () => {
    let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
      type: 'queryChanged',
      value: 'first-query',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'queryChanged',
      value: 'second-query',
      requestId: 2
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 2
    })

    expect(state.status).toBe('searching')
    expect(state.latestRequestId).toBe(2)
  })

  it('selects a returned service account by its real Keycloak user ID', () => {
    let state = permissionUserSearchReducer(initialPermissionUserSearchState, {
      type: 'queryChanged',
      value: serviceAccount.username,
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchStarted',
      requestId: 1
    })
    state = permissionUserSearchReducer(state, {
      type: 'searchSucceeded',
      requestId: 1,
      suggestions: [serviceAccount]
    })
    state = permissionUserSearchReducer(state, {
      type: 'personSelected',
      person: serviceAccount
    })

    expect(state.selectedPerson?.userId).toBe('keycloak-service-account-id')
    expect(state.selectedPerson?.userId).not.toBe(serviceAccount.username)
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
