import { useTranslation } from 'react-i18next'
import { BreadCrumb } from 'primereact/breadcrumb'
import { MenuItem, MenuItemOptions } from 'primereact/menuitem'
import { useNavigate } from 'react-router-dom'
import useLayoutStore from '../../stores/LayoutStore'
import useProjectStore from '../../stores/ProjectStore'

const Breadcrumbs: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const breadcrumbItems = useLayoutStore((state) => state.breadcrumbItems)
  const clearSelectedProject = useProjectStore((state) => state.clearSelectedProject)

  const navigateTo = (url?: string) => {
    if (!url) return
    if (url === '/projects') clearSelectedProject()
    navigate(url)
  }

  const itemTemplate = (item: MenuItem, options: MenuItemOptions) => {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          navigateTo(item.url)
        }}
        className={`${options.className} cursor-pointer bg-transparent border-0 p-0`}
      >
        <span className="block truncate max-w-28 xs:max-w-40 sm:max-w-60 md:max-w-none">
          {item.label}
        </span>
      </button>
    )
  }

  const translatedItems: MenuItem[] = breadcrumbItems.map((item) => ({
    label: t(item.label),
    url: item.url,
    template: itemTemplate
  }))

  const home: MenuItem = {
    label: t('home'),
    url: '/projects',
    template: itemTemplate
  }

  return (
    <BreadCrumb
      className="hidden sm:block m-0 p-2 bg-transparent h-[41px] border-none font-font-text"
      model={translatedItems}
      home={home}
    />
  )
}

export default Breadcrumbs
