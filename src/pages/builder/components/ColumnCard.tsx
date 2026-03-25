import { ReactNode } from 'react'

interface ColumnCardProps {
    title: string
    onClick?: () => void
    columns: ReactNode
}

export default function ColumnCard({ title, onClick, columns }: ColumnCardProps) {
    return (
        <div onClick={onClick} className="p-4 w-full bg-sidebar rounded-lg">
      

            {/* visible on small screens (sm and below) */}
            <div className="block md:hidden w-full text-black break-words text-center text-sm">
                {title}
            </div>

            {/* visible on medium+ screens (md and above) */}
            <div className="hidden md:block">
                <h3 className='text-black break-words text-center mb-3 text-sm lg:text-base'>{title}</h3>
                {columns}
            </div>
        </div>
    )
}
