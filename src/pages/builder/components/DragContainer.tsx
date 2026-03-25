import { ChevronUpDownIcon, EllipsisVerticalIcon} from '@heroicons/react/24/outline'
import type { Identifier, XYCoord } from 'dnd-core'
import type { FC, ReactNode } from 'react'
import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'



export interface CardProps {
  node: ReactNode
  index: number
  listId: string
  moveCard: (listId: string, dragIndex: number, hoverIndex: number) => void
}

interface DragItem {
  index: number
  listId: string
}

export const DragContainer: FC<CardProps> = ({
  node,
  index,
  listId,
  moveCard
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  const acceptType = `card-${listId}`

  const [{ handlerId }, drop] = useDrop<
    DragItem,
    void,
    { handlerId: Identifier | null }
  >({
    accept: acceptType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId()
      }
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return
      }

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect()

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

      // Determine mouse position
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      // Time to actually perform the action
      moveCard(listId, dragIndex, hoverIndex)

      // Mutate monitor item for performance (update index)
      item.index = hoverIndex
    }
  })

  const [{ isDragging }, drag, preview] = useDrag({
    type: acceptType,
    item: () => ({ index, listId }),
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging()
    })
  })

  const opacity = isDragging ? 0 : 1
  // drop on the container, drag only from the handle
  drop(ref)
  drag(handleRef)
  // use the full container as the drag preview so the whole item is visible
  preview(ref)
  
  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId} className='flex flex-row w-full'>
      <div ref={handleRef} aria-label="drag-handle" title="Drag" className="cursor-grab p-2">
        <ChevronUpDownIcon className="h-5 w-5" />
      </div>
      {node}
    </div>
  )
}
