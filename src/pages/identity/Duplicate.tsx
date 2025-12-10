import { useNavigate, useParams } from 'react-router'
import useDuplicatesStore from './stores/DuplicatesStore'
import Panel from '../../core/components/common/Panel'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import PrimaryButton from '../../core/components/form/buttons/PrimaryButton'
import SecondaryButton from '../../core/components/form/buttons/SecondaryButton'
import { useTranslation } from 'react-i18next'
import PersonService from './services/PersonService'

export default function Duplicate() {
  const { duplicateId } = useParams()
  const { duplicates, newEntry } = useDuplicatesStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Find the duplicate by ID
  const selectedDuplicate = duplicates.find(
    (d) => d.identifiers?.[0].identifier === duplicateId
  )

  // Format person data for display
  function formatPersonData(person: any) {
    if (!person) return []

    const firstPhone = person.phones?.[0]?.value ?? ''
    const firstEmail = person.emails?.[0]?.value ?? ''
    const firstAddress = person.addresses?.[0] ?? {}
    const addressString = firstAddress
      ? `${firstAddress.street ?? ''} ${firstAddress.houseNumber ?? ''}, ${firstAddress.zip ?? ''} ${firstAddress.city ?? ''}, ${firstAddress.country ?? ''}`
      : ''

    return [
      {
        code: t('search:entity.person.firstname.placeholder'),
        name: person.firstname ?? ''
      },
      {
        code: t('search:entity.person.lastname.placeholder'),
        name: person.lastname ?? ''
      },
      {
        code: t('search:entity.person.birthdate.placeholder'),
        name: person.birthdate
          ? new Date(person.birthdate).toLocaleDateString()
          : ''
      },
      {
        code: t('search:entity.person.gender.placeholder'),
        name: person.gender ?? ''
      },
      { code: t('search:entity.person.phone.placeholder'), name: firstPhone },
      { code: t('search:entity.person.email.placeholder'), name: firstEmail },
      {
        code: t('search:entity.person.address.placeholder'),
        name: addressString
      }
    ]
  }

  async function handleRegister() {
    if (!newEntry) {
      console.error('No new entry available to register.')
      return
    }
    const createdPerson = await PersonService.create(newEntry)
    console.log('Person created:', createdPerson)
    navigate(`/person/${createdPerson.identifiers?.[0].identifier}`)
  }

  const transformedNewData = formatPersonData(newEntry)
  const transformedExistingData = formatPersonData(selectedDuplicate)

  return (
    <div className="flex flex-col gap-6 w-full lg:flex-row items-center justify-center">
      <Panel
        centered
        title={t('identity:duplicate.newPerson')}
        className="max-w-3xl"
        noMaxWidth
      >
        <DataTable
          value={transformedNewData}
          showGridlines
          tableStyle={{ minWidth: '20rem' }}
        >
          <Column field="code"></Column>
          <Column field="name"></Column>
        </DataTable>

        <div className="flex justify-center mt-4">
          <SecondaryButton
            label={t('identity:buttons.notDuplicate')}
            onClick={handleRegister}
          />
        </div>
      </Panel>

      <Panel
        centered
        title={t('identity:duplicate.oldPerson')}
        className="max-w-3xl"
        noMaxWidth
      >
        <DataTable
          value={transformedExistingData}
          showGridlines
          tableStyle={{ minWidth: '20rem' }}
        >
          <Column field="code"></Column>
          <Column field="name"></Column>
        </DataTable>

        <div className="flex justify-center mt-4">
          <PrimaryButton label={t('identity:duplicate.useOld')} />
        </div>
      </Panel>
    </div>
  )
}
