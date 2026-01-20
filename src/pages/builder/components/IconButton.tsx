import { Button } from 'primereact/button'

interface IconButtonProps {
  icon: any
  onClick: () => void
}

export default function IconButton(props: IconButtonProps) {
  return (
    <Button
      type="button"
      onClick={props.onClick}
      className="p-2 border-none bg-transparent text-gray-500 hover:bg-transparent focus:outline-none focus:ring-0 "
      label={props.icon}
    ></Button>
  )
}
