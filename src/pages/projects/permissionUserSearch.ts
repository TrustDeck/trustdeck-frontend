import type { PersonSuggestion } from './types/Permission'

export type PersonSearchStatus =
  | 'idle'
  | 'searching'
  | 'success'
  | 'forbidden'
  | 'error'

export type PermissionUserSearchState = {
  query: string
  suggestions: PersonSuggestion[]
  selectedPerson: PersonSuggestion | null
  status: PersonSearchStatus
  userSearchRestricted: boolean
  latestRequestId: number
}

export type PermissionUserSearchAction =
  | { type: 'queryChanged'; value: string; requestId: number }
  | { type: 'searchStarted'; requestId: number }
  | {
      type: 'searchSucceeded'
      requestId: number
      suggestions: PersonSuggestion[]
    }
  | { type: 'searchForbidden'; requestId: number }
  | { type: 'searchFailed'; requestId: number }
  | { type: 'personSelected'; person: PersonSuggestion }
  | { type: 'cleared'; requestId: number }

export const initialPermissionUserSearchState: PermissionUserSearchState = {
  query: '',
  suggestions: [],
  selectedPerson: null,
  status: 'idle',
  userSearchRestricted: false,
  latestRequestId: 0
}

export function trimPersonSearchQuery(value: string) {
  const query = value.trim()
  return query || null
}

export function isReturnedPersonSuggestion(
  value: unknown,
  suggestions: PersonSuggestion[]
): value is PersonSuggestion {
  return (
    typeof value === 'object' &&
    value !== null &&
    suggestions.some((suggestion) => suggestion === value)
  )
}

export function hasNoPersonSearchResults(state: PermissionUserSearchState) {
  return state.status === 'success' && state.suggestions.length === 0
}

function displayValue(person: PersonSuggestion) {
  return [person.name, person.email ? `(${person.email})` : '']
    .filter(Boolean)
    .join(' ')
}

function isCurrentRequest(state: PermissionUserSearchState, requestId: number) {
  return state.latestRequestId === requestId
}

export function permissionUserSearchReducer(
  state: PermissionUserSearchState,
  action: PermissionUserSearchAction
): PermissionUserSearchState {
  switch (action.type) {
    case 'queryChanged':
      return {
        ...state,
        query: action.value,
        suggestions: [],
        selectedPerson: null,
        status: 'idle',
        userSearchRestricted: false,
        latestRequestId: action.requestId
      }
    case 'searchStarted':
      return {
        ...state,
        suggestions: [],
        selectedPerson: null,
        status: 'searching',
        userSearchRestricted: false,
        latestRequestId: action.requestId
      }
    case 'searchSucceeded':
      return isCurrentRequest(state, action.requestId)
        ? {
            ...state,
            suggestions: action.suggestions,
            status: 'success',
            userSearchRestricted: false
          }
        : state
    case 'searchForbidden':
      return isCurrentRequest(state, action.requestId)
        ? {
            ...state,
            suggestions: [],
            selectedPerson: null,
            status: 'forbidden',
            userSearchRestricted: true
          }
        : state
    case 'searchFailed':
      return isCurrentRequest(state, action.requestId)
        ? {
            ...state,
            suggestions: [],
            selectedPerson: null,
            status: 'error',
            userSearchRestricted: false
          }
        : state
    case 'personSelected':
      return isReturnedPersonSuggestion(action.person, state.suggestions)
        ? {
            ...state,
            query: displayValue(action.person),
            selectedPerson: action.person,
            status: 'success'
          }
        : state
    case 'cleared':
      return {
        ...initialPermissionUserSearchState,
        latestRequestId: action.requestId
      }
  }
}
