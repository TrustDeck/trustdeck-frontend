import { useTranslation } from 'react-i18next'
import { BreadCrumb } from 'primereact/breadcrumb'
import { MenuItem, MenuItemOptions } from 'primereact/menuitem'
import useLayoutStore from '../../stores/LayoutStore' // Import useLayoutStore

const Breadcrumbs: React.FC = () => {
  const { t } = useTranslation() // Use multiple namespaces
  const breadcrumbItems = useLayoutStore((state) => state.breadcrumbItems) // Use LayoutStore

  // Custom item template using Tailwind CSS for responsive truncation
  const itemTemplate = (item: MenuItem, options: MenuItemOptions) => {
    return (
      <a href={item.url} className={options.className}>
        <span className="block truncate max-w-28 xs:max-w-40 sm:max-w-60 md:max-w-none">
          {item.label}
        </span>
      </a>
    )
  }

  const translatedItems: MenuItem[] = breadcrumbItems.map((item) => ({
    label: t(item.label), // Translate using i18next
    url: item.url,
    template: itemTemplate
  }))

  const home: MenuItem = { label: t('home'), url: '/projects' }

  return (
    <BreadCrumb
      className="hidden sm:block m-0 p-2 bg-transparent h-[41px] border-none font-font-text"
      model={translatedItems}
      home={home}
    />
  )
}

export default Breadcrumbs
