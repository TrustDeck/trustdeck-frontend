import React, { useState } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'

import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteChangeEvent
} from 'primereact/autocomplete'
import TrustDeck from '@service/TrustDeck'
import { Operator, Permission } from '../../core/types/Permission'

import useProjectStore from '../../core/stores/ProjectStore.tsx'
import FieldForm from './components/FieldForm.tsx'
import { Domain } from '../../core/types/Domain.ts'
import { PermissionsService } from '../../core/configs/permission.ts'

import { XMarkIcon } from '@heroicons/react/24/outline'
import SecondaryButton from '@component/form/buttons/SecondaryButton.tsx'
import ProjectService from './services/ProjectService.ts'
import { ConfirmDialog } from 'primereact/confirmdialog'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import SecondaryOutlinedButton from '@component/form/buttons/SecondaryOutlinedButton.tsx'
import { FileUpload } from 'primereact/fileupload'

type PersonSuggestion = Operator & { name: string }

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const currentProject = useProjectStore((state) => state.projectName)

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<
    PersonSuggestion[]
  >([])
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [domainTree, setDomainTree] = useState<Domain[]>([])
  const [userPermissions, setUserPermissions] = useState<Permission[]>([])
  const [allDomainPermissions, setAllDomainPermissions] = useState<
    Record<string, Record<string, string>>
  >({})
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const navigate = useNavigate()

  const fetchPersons = async (query: string): Promise<PersonSuggestion[]> => {
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator) => {
      let name = operator.username
      if (operator.email && operator.lastName) {
        name = `${operator.email.split('.')[0]} ${operator.lastName}`
      } else if (operator.firstName) {
        name = operator.firstName
      } else if (operator.lastName) {
        name = operator.lastName
      }
      return {
        ...operator,
        name
      }
    })
  }

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    setSelectedPersonId('')
    const results = await fetchPersons(event.query)
    setPersonSuggestions(results.length === 0 ? [] : results)
  }

  const setLoadingState = (loading: boolean, message: string) => {
    setLoading(loading)
    setLoadingMessage(message)
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value != null) {
      if (e.value && e.value.username) {
        const personSuggestion = e.value as PersonSuggestion
        setPersonValue(
          [
            personSuggestion.name,
            personSuggestion.email ? `(${personSuggestion.email})` : '',
            personSuggestion.federation
              ? `(${personSuggestion.federation})`
              : ''
          ].join(' ')
        )
        setSelectedPersonId(e.value.userId)
        setLoadingState(true, `Loading permissions for ${e.value.name}...`)
        const permissions = await TrustDeck.instance().getUserPermissions(
          e.value.username
        )
        setUserPermissions(permissions)
        const flatTree =
          await TrustDeck.instance().getFlatRootDomainTree(currentProject)
        setDomainTree(flatTree)
        setLoadingState(false, '')
      } else {
        setPersonValue(e.value)
        setSelectedPersonId('')
      }
    }
  }

  const handleDomainPermissionsChange = (
    area: string,
    permissions: Record<string, string>
  ) => {
    setAllDomainPermissions((prev) => ({
      ...prev,
      [area]: permissions
    }))
  }

  const handleDelete = async () => {
    try {
      setLoadingDelete(true)
      await ProjectService.deleteProject()
      navigate('/projects')
      setLoadingDelete(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (selectedPersonId) {
      setLoadingState(true, 'Updating permissions...')
      const permissionRequestList =
        PermissionsService.instance().createPermissionRequestList(
          selectedPersonId,
          allDomainPermissions
        )

      await TrustDeck.instance()
        .updateUserPermissions(selectedPersonId, permissionRequestList)
        .then(() => {
          console.log('Permissions updated successfully')
          setUserPermissions(permissionRequestList)
        })
        .catch((error) => {
          console.error('Error updating permissions:', error)
        })

      setLoadingState(false, '')
    }
  }

  const personItemTemplate = (item: PersonSuggestion) => (
    <div>
      <span className="font-semibold">{item.name}</span>
      {item.email && (
        <span className="ml-2 text-xs text-gray-500">{item.email}</span>
      )}
      {item.federation && (
        <span className="ml-2 text-xs text-gray-400">({item.federation})</span>
      )}
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen w-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center w-full px-4 pt-4">
        <h1 className="text-center">{t('settings:header')}</h1>

        <Panel
          title={t('settings:panelTitle')}
          className="w-full max-w-4xl mt-4"
        >
          <div className="relative flex flex-row items-center w-full gap-2">
            <AutoComplete
              value={personValue}
              suggestions={personSuggestions}
              completeMethod={handlePersonSearch}
              onChange={handlePersonChange}
              field="name"
              itemTemplate={personItemTemplate}
              forceSelection
              placeholder="Person suchen..."
              className="flex-1"
              inputClassName="w-full"
            />
            {personValue && (
              <button
                type="button"
                onClick={() => {
                  setPersonValue('')
                  setSelectedPersonId(null)
                  setPersonSuggestions([])
                  setUserPermissions([])
                  setDomainTree([])
                  setAllDomainPermissions({})
                }}
                className="flex-shrink-0 flex px-4 py-2 bg-blue-500 text-white rounded"
                tabIndex={-1}
                aria-label="Clear"
              >
                <XMarkIcon className="h-7 w-7" />
              </button>
            )}
          </div>

          {selectedPersonId && (
            <>
              {loading ? (
                <div>{loadingMessage}</div>
              ) : (
                <>
                  <FieldForm
                    userId={selectedPersonId}
                    area="permission"
                    userPermissions={userPermissions}
                    domainTree={domainTree}
                    useOnlyRoot={true}
                    onDomainPermissionsChange={handleDomainPermissionsChange}
                  />

                  <FieldForm
                    userId={selectedPersonId}
                    area="person"
                    userPermissions={userPermissions}
                    domainTree={domainTree}
                    useOnlyRoot={true}
                    onDomainPermissionsChange={handleDomainPermissionsChange}
                  />

                  <FieldForm
                    userId={selectedPersonId}
                    area="record"
                    userPermissions={userPermissions}
                    domainTree={domainTree}
                    useOnlyRoot={false}
                    onDomainPermissionsChange={handleDomainPermissionsChange}
                  />

                  <button
                    onClick={handleSave}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Save Permissions
                  </button>
                </>
              )}
            </>
          )}
        </Panel>
        <Panel title={t('settings:photo')} className="mt-6">
          <FileUpload
            mode="basic"
            name="image"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            maxFileSize={5 * 1024 * 1024}
            customUpload
            uploadHandler={async (e) => {
              const file = e.files[0]
              try {
                await TrustDeck.instance().createImage(file)
                window.location.reload()
              } catch (err) {
                console.error('Upload failed', err)
              }
            }}
            auto
            multiple={false}
            className="file-upload-button"
          />
        </Panel>
      </div>

      {/* Bottom Danger Zone */}
      <div className="w-full flex justify-center px-4 pb-20 mb-20">
        <Panel title="Danger zone" className="w-full max-w-4xl">
          <div className="flex justify-center">
            <SecondaryButton
              label="Delete project permanently"
              onClick={() => setConfirmVisible(true)}
            />
          </div>
        </Panel>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        visible={confirmVisible}
        onHide={() => setConfirmVisible(false)}
        message="Are you sure you want to permanently delete this project?"
        header="Confirm Deletion"
        icon="pi pi-exclamation-triangle"
        closable={true}
        footer={
          <div className="flex justify-end gap-2">
            <SecondaryOutlinedButton
              label="Yes, Delete"
              loading={loadingDelete}
              onClick={handleDelete}
            />
            <PrimaryButton
              label="Cancel"
              onClick={() => setConfirmVisible(false)}
            />
          </div>
        }
      />
    </div>
  )
}

export default Settings
