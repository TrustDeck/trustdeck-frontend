import React from 'react'

interface DividerProps {
  text?: string
}

const Divider: React.FC<DividerProps> = ({ text }) => {
  if (!text) {
    return <hr className="my-4 w-full border-black" />
  }

  return (
    <div className="flex items-center my-4">
      <hr className="flex-grow border-black" />
      <span className="mx-4 text-lg text-black whitespace-nowrap">{text}</span>
      <hr className="flex-grow border-black" />
    </div>
  )
}

export default Divider
