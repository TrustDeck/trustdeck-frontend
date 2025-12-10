import React from 'react'
import { useTranslation } from 'react-i18next'
import Panel from '../../core/components/common/Panel'
import {
  TabView,
  TabPanel,
  TabPanelHeaderTemplateOptions
} from 'primereact/tabview'
import {
  EyeSlashIcon,
  // RectangleStackIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import 'primereact/resources/themes/saga-blue/theme.css'
import 'primereact/resources/primereact.min.css'
import EntityMask from './components/EntityMask'
import PseudonymMask from './components/PseudonymMask'
// import GroupMask from './components/GroupMask'
// import SearchResult from '@component/common/SearchResult'

// This component renders in three tabs: Entity, Pseudonym, and Group. The user can select what they want to search. A 'psn' prop can be passed to SearchMask to hide the recent searches area, as well as the headers. This component can then be used in the pseudonymisation flow to search for an entity that should be pseudonymised.

export default function SearchMask({ psn = false }) {
  const { t } = useTranslation() // Use multiple namespaces

  const tabHeaderTemplate = (
    options: TabPanelHeaderTemplateOptions,
    icon: React.ReactNode,
    label: string
  ) => {
    const activeClass = options.selected
      ? 'text-color-dark-blue border-b-2 border-color-dark-blue mb-[-2px]'
      : ''
    return (
      <div
        className={`flex items-center justify-center gap-2 p-1 text-base ${activeClass}`}
        style={{ cursor: 'pointer' }}
        onClick={options.onClick}
      >
        {icon}
        <span className="white-space-nowrap">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Panel title={psn ? '' : t('search:title')}>
        <TabView>
          <TabPanel
            header="entity"
            headerTemplate={(options) =>
              tabHeaderTemplate(
                options,
                <TagIcon className="w-5 h-5" />,
                t('search:entity.title')
              )
            }
          >
            <div>
              <EntityMask psn={psn} />
            </div>
          </TabPanel>
          <TabPanel
            header="psn"
            headerTemplate={(options) =>
              tabHeaderTemplate(
                options,
                <EyeSlashIcon className="w-5 h-5" />,
                t('search:pseudonym.title')
              )
            }
          >
            <div>
              <PseudonymMask psn={psn} />
            </div>
          </TabPanel>
          {/* <TabPanel
            header="group"
            headerTemplate={(options) =>
              tabHeaderTemplate(
                options,
                <RectangleStackIcon className="w-5 h-5" />,
                t('search:group.title')
              )
            }
          >
            <div>
              <GroupMask psn={psn} />
            </div>
          </TabPanel> */}
        </TabView>
      </Panel>
      {/* <div className="my-4"></div>
      {!psn && <Panel className="mb-5" title={t('search:history')} />}
      {!psn && (
        <SearchResult
          recent
          result={{
            id: '2',
            type: 'person',
            firstname: 'John',
            lastname: 'Smith',
            birthdate: '1932-12-31',
            gender: 'Male',
            phone: '12345',
            street: 'a',
            houseNumber: 'a',
            city: 'a',
            zip: '1'
          }}
        />
      )} */}
    </div>
  )
}
