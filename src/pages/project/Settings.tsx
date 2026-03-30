import React, { useState, useEffect, useMemo } from 'react'
import Panel from '@component/common/Panel'
import { useTranslation } from 'react-i18next'
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteChangeEvent
} from 'primereact/autocomplete'
import TrustDeck from '@service/TrustDeck'
import type { Operator } from '../../core/types/Permission'
import useProjectStore from '../../core/stores/ProjectStore'
import { ProjectType } from '../projects/types/ProjectType'
import ProjectService from '../projects/services/ProjectService'
import { XMarkIcon } from '@heroicons/react/24/outline'
import LocalProjectService from './services/ProjectService.ts'
import { useNavigate } from 'react-router-dom'
import PrimaryButton from '@component/form/buttons/PrimaryButton.tsx'
import { FileUpload } from 'primereact/fileupload'
import useToastStore from '../../core/stores/ToastStore'

import type {
  DefinedPermission,
  DomainPermissionUpdate,
  EffectivePermission,
  PersonSuggestion,
  ProjectPermissionUpdate
} from './types'
import { collectDomainNames } from './utils/domainTree'
import {
  buildAllPermissionRows,
  filterEffectivePermissions,
  permissionKey
} from './utils/permissionRows'
import EffectivePermissionsList from './components/EffectivePermissionsList'
import ProjectInfoSection from './components/ProjectInfoSection'
import DeleteProjectSection from './components/DeleteProjectSection'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const showToast = useToastStore((state) => state.show)
  const selectedProject = useProjectStore((state) => state.selectedProject)
  const [projectDetails, setProjectDetails] = useState<ProjectType | null>(null)
  const [projectDomainNames, setProjectDomainNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!selectedProject?.abbreviation) return
      try {
        const projects = await ProjectService.getProjects()
        const match = projects.find((p) => p.abbreviation === selectedProject.abbreviation)
        if (isMounted && match) setProjectDetails(match)
      } catch (e) {
        console.error('Failed to load project details', e)
        if (isMounted) setProjectDetails(null)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [selectedProject?.abbreviation])

  useEffect(() => {
    let isMounted = true
    const loadProjectDomains = async () => {
      if (!selectedProject?.abbreviation) {
        setProjectDomainNames(new Set())
        return
      }
      try {
        const subtree = await TrustDeck.instance().getGroups()
        const names = new Set<string>()
        collectDomainNames(subtree, names)
        if (isMounted) setProjectDomainNames(names)
      } catch (error) {
        console.error('Failed to load project domain subtree', error)
        if (isMounted) setProjectDomainNames(new Set())
      }
    }
    loadProjectDomains()
    return () => {
      isMounted = false
    }
  }, [selectedProject?.abbreviation])

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [personValue, setPersonValue] = useState<string>('')
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [loadingMessage, setLoadingMessage] = useState<string>('')
  const [selectedPerson, setSelectedPerson] = useState<PersonSuggestion | null>(null)
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>({})
  const [definedPermissions, setDefinedPermissions] = useState<DefinedPermission[]>([])
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    let isMounted = true
    const loadDefinedPermissions = async () => {
      try {
        const perms = await TrustDeck.instance().getDefinedPermissions()
        if (isMounted) setDefinedPermissions(perms ?? [])
      } catch (error) {
        console.error('Failed to load defined permissions', error)
        if (isMounted) setDefinedPermissions([])
      }
    }
    loadDefinedPermissions()
    return () => {
      isMounted = false
    }
  }, [])

  const setLoadingState = (next: boolean, message: string) => {
    setLoading(next)
    setLoadingMessage(message)
  }

  const filteredEffectivePermissions = useMemo(
    () =>
      filterEffectivePermissions(
        selectedPerson?.effectivePermissions,
        selectedProject?.abbreviation,
        projectDomainNames,
        false
      ),
    [selectedPerson?.effectivePermissions, selectedProject?.abbreviation, projectDomainNames]
  )

  const allPermissionRows: EffectivePermission[] = useMemo(
    () =>
      buildAllPermissionRows(
        definedPermissions,
        selectedProject?.abbreviation,
        projectDomainNames,
        filteredEffectivePermissions,
        false
      ),
    [
      definedPermissions,
      filteredEffectivePermissions,
      projectDomainNames,
      selectedProject?.abbreviation
    ]
  )

  const fetchPersons = async (query: string): Promise<PersonSuggestion[]> => {
    const fetchedOperators = await TrustDeck.instance().searchOperators(query)
    return fetchedOperators.map((operator: Operator) => ({
      ...operator,
      name: `${operator.firstName} ${operator.lastName}`
    }))
  }

  const handlePersonSearch = async (event: AutoCompleteCompleteEvent) => {
    setSelectedPersonId(null)
    const results = await fetchPersons(event.query)
    setPersonSuggestions(results.length === 0 ? [] : results)
  }

  const handlePersonChange = async (e: AutoCompleteChangeEvent) => {
    if (e.value == null) return
    if (e.value && (e.value as PersonSuggestion).username) {
      const personSuggestion = e.value as PersonSuggestion
      setPersonValue(
        [
          personSuggestion.name,
          personSuggestion.email ? `(${personSuggestion.email})` : '',
          personSuggestion.federation ? `(${personSuggestion.federation})` : ''
        ].join(' ')
      )
      setSelectedPersonId(personSuggestion.userId ?? null)
      setSelectedPerson(personSuggestion)
      const base = filterEffectivePermissions(
        personSuggestion.effectivePermissions,
        selectedProject?.abbreviation,
        projectDomainNames,
        false
      )
      const initialState: Record<string, boolean> = {}
      allPermissionRows.forEach((p) => {
        initialState[permissionKey(p)] = false
      })
      base.forEach((p) => {
        initialState[permissionKey(p)] = true
      })
      setPermissionState(initialState)
    } else {
      setPersonValue(e.value as string)
      setSelectedPersonId(null)
      setSelectedPerson(null)
      setPermissionState({})
    }
  }

  const handleDelete = async () => {
    try {
      setLoadingDelete(true)
      await LocalProjectService.deleteProject()
      navigate('/projects')
      setLoadingDelete(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleSave = async () => {
    if (!selectedPersonId || !selectedPerson || !selectedProject?.abbreviation) return
    try {
      setLoadingState(true, 'Updating permissions...')

      const domainPermissions = allPermissionRows.filter(
        (p) =>
          p.resourceType === 'DOMAIN' &&
          Boolean(p.resourceName) &&
          Boolean(permissionState[permissionKey(p)])
      )
      const projectPermissions = allPermissionRows.filter(
        (p) =>
          p.resourceType === 'PROJECT' &&
          p.resourceName === selectedProject.abbreviation &&
          Boolean(permissionState[permissionKey(p)])
      )
      const payload: DomainPermissionUpdate[] = domainPermissions.map((p) => ({
        subjectId: selectedPersonId,
        resourceType: 'DOMAIN',
        domainName: p.resourceName!,
        action: p.action,
        decision: 'ALLOW'
      }))

      const projectPayload: ProjectPermissionUpdate[] = projectPermissions.map((p) => ({
        subjectId: selectedPersonId,
        resourceType: 'PROJECT',
        projectAbbreviation: selectedProject.abbreviation,
        action: p.action,
        decision: 'ALLOW'
      }))

      await Promise.all([
        TrustDeck.instance().updateDomainPermissions(selectedPersonId, payload),
        TrustDeck.instance().updateProjectPermissions(selectedPersonId, projectPayload)
      ])

      setPersonValue('')
      setPersonSuggestions([])
      setSelectedPersonId(null)
      setSelectedPerson(null)
      setPermissionState({})
      showToast({
        severity: 'success',
        summary: 'Success',
        detail: 'Permissions updated successfully',
        life: 3000
      })
    } catch (error) {
      console.error('Failed to update permissions', error)
      showToast({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update permissions',
        life: 4000
      })
    } finally {
      setLoadingState(false, '')
    }
  }

  const personItemTemplate = (item: PersonSuggestion) => (
    <div>
      <span className="font-semibold">{item.name}</span>
      {item.email && <span className="ml-2 text-xs text-gray-500">{item.email}</span>}
      {item.federation && (
        <span className="ml-2 text-xs text-gray-400">({item.federation})</span>
      )}
    </div>
  )

  const clearPersonSelection = () => {
    setPersonValue('')
    setSelectedPersonId(null)
    setPersonSuggestions([])
    setSelectedPerson(null)
    setPermissionState({})
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="flex-1 flex flex-col items-center w-full px-4 pt-4">
        <h1 className="text-center">{t('settings:header')}</h1>

        <ProjectInfoSection
          t={t}
          projectDetails={projectDetails}
          selectedProject={selectedProject}
        />

        <Panel title={t('settings:panelTitle')} className="w-full max-w-4xl mt-4">
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
                onClick={clearPersonSelection}
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
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Effective permissions</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Toggle project and domain permissions for the selected user.
                    </p>
                    <EffectivePermissionsList
                      allPermissionRows={allPermissionRows}
                      permissionState={permissionState}
                      onPermissionChange={(key, checked) =>
                        setPermissionState((prev) => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <PrimaryButton
                      label={loading ? 'Saving...' : 'Save Permissions'}
                      onClick={handleSave}
                      loading={loading}
                    />
                  </div>
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
            className="file-upload-button mt-4"
          />
        </Panel>
      </div>

      <DeleteProjectSection
        confirmVisible={confirmVisible}
        loadingDelete={loadingDelete}
        onOpenConfirm={() => setConfirmVisible(true)}
        onCloseConfirm={() => setConfirmVisible(false)}
        onConfirmDelete={handleDelete}
      />
    </div>
  )
}

export default Settings
