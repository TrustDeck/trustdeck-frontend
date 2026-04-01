import { create } from 'zustand'

export type AttributeType =
  | 'string'
  | 'integer'
  | 'date'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'enum'

export type Layout = 'row' | 'col'

export type Attribute = {
  key: string
  name?: string
  labelEn?: string
  labelDe?: string
  type?: AttributeType
  required?: boolean
  linkage?: boolean
  repeatable?: boolean
  group?: boolean
  minimum?: number
  maximum?: number
  pattern?: string
  minLength?: number
  maxLength?: number
  values?: string[]
  layout?: Layout
  attributes?: Attribute[] //key name might be changed
}

type EntityTypeStore = {
  selectedKey: string
  setSelectedKey: (key: string) => void
  getSelectedAttribute: () => Attribute | undefined
  entityType: string
  setEntityType: (entityType: string) => void
  attributes: Attribute[]
  appendAttribute: (attribute: Attribute) => void
  moveAttribute: (fromIndex: number, toIndex: number) => void
  deleteAttribute: (key: string) => void
  appendSubAttributes: (key: string, attribute: Attribute) => void
  overrideAttribute: (key: string, attribute: Attribute) => void
  updatePartialAttribute: (
    key: string,
    attributeKey: string,
    value: any
  ) => void
  resetAttribute: (key: string) => void
  moveSubAttribute: (listId: string, fromIndex: number, toIndex: number) => void
}

export const useEntityTypeStore = create<EntityTypeStore>((set, get) => ({
  moveSubAttribute: (listId: string, dragIndex: number, hoverIndex: number) =>
   set((state) => {
      // If listId is empty string, operate on top-level attributes array
      if (listId === '') {
        const attrs = [...state.attributes]
        if (dragIndex < 0 || dragIndex >= attrs.length) return { attributes: attrs }
        const [removed] = attrs.splice(dragIndex, 1)
        const dest = Math.max(0, Math.min(hoverIndex, attrs.length))
        attrs.splice(dest, 0, removed)
        return { attributes: attrs }
      }

      // Otherwise find the attribute with matching key and group === true
      function updateRecursive(list: Attribute[]): Attribute[] {
        return list.map((attr) => {
          if (attr.key === listId && attr.group && attr.attributes) {
            const sub = [...attr.attributes]
            if (dragIndex < 0 || dragIndex >= sub.length) return { ...attr, attributes: sub }
            const [removed] = sub.splice(dragIndex, 1)
            const dest = Math.max(0, Math.min(hoverIndex, sub.length))
            sub.splice(dest, 0, removed)
            return { ...attr, attributes: sub }
          }

          if (attr.attributes && attr.attributes.length) {
            return { ...attr, attributes: updateRecursive(attr.attributes) }
          }

          return attr
        })
      }

      return {
        attributes: updateRecursive(state.attributes)
      }

    }),
  resetAttribute: (key: string) =>
    set((state) => {
     //iterate recuseive and get the attribute by key
     //then remove all keys except key, group, layout
      function resetRecursive(list: Attribute[]): Attribute[] {
        return list.map((attr) => {
          if (attr.key === key) {
            const base: Partial<Attribute> = { key: attr.key }
            if (attr.group !== undefined) base.group = attr.group
            if (attr.layout !== undefined) base.layout = attr.layout

            return base as Attribute
          }

          if (attr.attributes && attr.attributes.length) {
            return { ...attr, attributes: resetRecursive(attr.attributes) }
          }

          return attr
        })
      }

      return {
        attributes: resetRecursive(state.attributes)
      }
    }),
  updatePartialAttribute: (key: string, attributeKey: string, value: any) =>
    set((state) => {
      function updateRecursive(list: Attribute[]): Attribute[] {
        return list.map((attr) => {
          if (attr.key === key) {
            return { ...attr, [attributeKey]: value }
          }

          if (attr.attributes && attr.attributes.length) {
            return { ...attr, attributes: updateRecursive(attr.attributes) }
          }

          return attr
        })
      }

      return {
        attributes: updateRecursive(state.attributes)
      }
    }),
  getSelectedAttribute: () => {
    const key = get().selectedKey
    if (!key) return undefined

    function find(list: Attribute[] | undefined): Attribute | undefined {
      if (!list || !list.length) return undefined
      for (const attr of list) {
        if (attr.key === key) return attr
        const found = find(attr.attributes)
        if (found) return found
      }
      return undefined
    }

    return find(get().attributes)
  },
  selectedKey: '',
  setSelectedKey: (key: string) =>
    set(() => ({
      selectedKey: key
    })),
  entityType: 'Person',
  setEntityType: (entityType: string) =>
    set(() => ({
      entityType
    })),
  attributes: [],
  appendAttribute: (attribute: Attribute) =>
    set((state) => ({
      attributes: [...state.attributes, attribute]
    })),
  moveAttribute: (fromIndex: number, toIndex: number) =>
    set((state) => {
      const attrs = [...state.attributes]
      if (fromIndex < 0 || fromIndex >= attrs.length)
        return { attributes: attrs }
      const [moved] = attrs.splice(fromIndex, 1)
      const dest = Math.max(0, Math.min(toIndex, attrs.length))
      attrs.splice(dest, 0, moved)
      return { attributes: attrs }
    }),
  deleteAttribute: (key: string) =>
    set((state) => {
      const removeRecursive = (list: Attribute[]): Attribute[] =>
        list
          .filter((attr) => attr.key !== key)
          .map((attr) =>
            attr.attributes && attr.attributes.length
              ? { ...attr, attributes: removeRecursive(attr.attributes) }
              : attr
          )

      const nextAttributes = removeRecursive(state.attributes)
      const nextSelectedKey = state.selectedKey === key ? '' : state.selectedKey

      return { attributes: nextAttributes, selectedKey: nextSelectedKey }
    }),
  appendSubAttributes: (key: string, attribute: Attribute) =>
    set((state) => {
      const updatedAttributes = state.attributes.map((attr) =>
        attr.key === key
          ? { ...attr, attributes: [...(attr.attributes ?? []), attribute] }
          : attr
      )

      return {
        attributes: updatedAttributes
      }
    }),
  overrideAttribute: (key: string, attribute: Attribute) =>
    set((state) => {
      function overrideRecursive(list: Attribute[]): Attribute[] {
        return list.map((attr) => {
          if (attr.key === key) {
            const base: Partial<Attribute> = { key: attr.key }
            if (attr.group !== undefined) base.group = attr.group
            if (attr.layout !== undefined) base.layout = attr.layout

            // Return only preserved base values merged with incoming attribute
            return { ...(base as Attribute), ...attribute, key: attr.key }
          }

          if (attr.attributes && attr.attributes.length) {
            return { ...attr, attributes: overrideRecursive(attr.attributes) }
          }

          return attr
        })
      }

      return {
        attributes: overrideRecursive(state.attributes)
      }
    })
}))
