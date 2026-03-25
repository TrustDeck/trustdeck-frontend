import { Card } from 'primereact/card'
import { ReactNode } from 'react'

/**
 * CustomCard component is a stylized card that displays a title and an icon.
 * It is designed to be clickable, and it accepts an optional `onClick` handler.
 *
 * @component
 * @example
 * // Usage example
 * <CustomCard title="Profile" icon={<FaUser />} onClick={() => alert('Clicked!')} />
 *
 * @param {string} title - The title to display in the card's header.
 * @param {ReactNode} icon - The icon or content to display inside the card. It can be any valid React component or JSX element.
 * @param {function} [onClick] - Optional function to be called when the card is clicked.
 *
 * @returns {JSX.Element} A clickable card component with a title and an icon.
 */

interface CustomCardProps {
  title: string
  icon?: ReactNode
  onClick?: () => void
  className?: string
  bgColor?: string
}

export default function CustomCard({
  title,
  icon,
  onClick,
  className,
  bgColor
}: CustomCardProps) {
  const background = bgColor ?? 'bg-sidebar'
  return (
    <div onClick={onClick}>
      {/* phone screen */}
      <div
        className={`sm:hidden ${background} border-black rounded-lg border-2 flex justify-start items-center p-4 space-x-4 ${className}`}
      >
        <div className="text-black w-12 h-12">{icon}</div>
        <h3>{title}</h3>
      </div>
      {/* screens small and up */}
      <Card
        className={`hidden sm:block ${background} text-center rounded-lg border-2 border-black cursor-pointer ${className}`}
        header={
          <h2 className="text-black break-words mt-8 max-w-[300px]">{title}</h2>
        }
      >
        <div className="sm:w-full sm:h-40 item text-black w-16 h-16 max-w-[100px]">
          {icon}
        </div>
      </Card>
    </div>
  )
}
