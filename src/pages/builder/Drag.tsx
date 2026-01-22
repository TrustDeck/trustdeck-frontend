import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

// removed dependency on 'immutability-helper'; using native array operations

import { useCallback, useState } from 'react'
import { DragContainer } from './components/DragContainer'

const style = {
  width: 400,
}

export interface Item {
  key: string
  node: React.ReactNode
}

export interface DragContainerState {
  cards: Item[]
}

const Drag: React.FC = () => {
  const [lists, setLists] = useState(() => ({
    a: [
      { key: crypto.randomUUID(), node: (<div><strong>A:</strong><span className="ml-2">Write a cool JS library</span></div>) },
      { key: crypto.randomUUID(), node: (<div><strong>A:</strong><span className="ml-2">Make it generic enough</span></div>) },
      { key: crypto.randomUUID(), node: (<div><strong>A:</strong><span className="ml-2">Write README</span></div>) },
    ] as Item[],
    b: [
      { key: crypto.randomUUID(), node: (<div><strong>B:</strong><span className="ml-2">Create some examples</span></div>) },
      { key: crypto.randomUUID(), node: (<div><strong>B:</strong><span className="ml-2">Promote it</span></div>) },
      { key: crypto.randomUUID(), node: (<div><strong>B:</strong><span className="ml-2">???</span></div>) },
      { key: crypto.randomUUID(), node: (<div><strong>B:</strong><span className="ml-2">PROFIT</span></div>) },
    ] as Item[],
  }))

  const moveCard = useCallback((listId: string, dragIndex: number, hoverIndex: number) => {
    setLists(prev => {
      const updated = { ...prev }
      const list = [...updated[listId as keyof typeof updated]]
      const [removed] = list.splice(dragIndex, 1)
      list.splice(hoverIndex, 0, removed)
      updated[listId as keyof typeof updated] = list
      return updated
    })
  }, [])

  const renderCard = useCallback(
    (card: { key: string; node: React.ReactNode }, index: number, listId: string) => {
      return (
        <DragContainer
          key={card.key} // stabile key
          index={index}
          node={card.node}
          listId={listId}
          moveCard={moveCard}
        />
      )
    },
    [moveCard],
  )

  return (
    <DndProvider backend={HTML5Backend}>
      <>
        <div style={{ ...style, display: 'flex', gap: 24 }}>
          <div>
            <h4>List A</h4>
            <div>{lists.a.map((card, i) => renderCard(card, i, 'a'))}</div>
          </div>
          <div>
            <h4>List B</h4>
            <div>{lists.b.map((card, i) => renderCard(card, i, 'b'))}</div>
          </div>
        </div>
      </>
    </DndProvider>
  )
}

export default Drag
