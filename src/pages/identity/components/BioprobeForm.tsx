import Panel from '../../../core/components/common/Panel'
import useInputStore from '../stores/InputStore'
import { useTranslation } from 'react-i18next'
import Divider from '../../../core/components/common/Divider'
import SecondaryButton from '../../../core/components/form/buttons/SecondaryButton'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import validation from '../../../core/utils/validation'
import BioSampleService from '../services/BioSampleService'

/**
 * `BioprobeForm` is a React component for registering or editing bioprobe data.
 * It provides a form with four fields—location, date, contents, and sample number—
 * and manages its internal state using a Zustand store (`useInputStore`).
 *
 * The form uses custom and PrimeReact UI components for consistent styling
 * and supports internationalization via `react-i18next`.
 *
 * The "Register" button is disabled until all fields are filled.
 *
 * @component
 * @returns {JSX.Element} The rendered bioprobe form UI.
 */

export default function BioprobeForm() {
  const { t } = useTranslation()
  const {
    location,
    setLocation,
    date,
    setDate,
    contents,
    setContents,
    sampleNumber,
    setSampleNumber
  } = useInputStore()

  async function handleRegister() {
    const payload = {
      location,
      date,
      contents,
      identifiers: {
        sampleNumber
      }
    }

    try {
      await BioSampleService.create(payload)
    } catch (error) {
      console.error('Failed to register Biosample' + error)
    }
  }

  const isFormValid = !!location && !!date && !!contents && !!sampleNumber

  return (
    <Panel>
      <h2 className="td-section-title">{t('identity:headers.data')}</h2>
      <Divider />
      <div className="sm:form-grid sm:space-y-0 space-y-3 my-3">
        <CustomFloatLabel
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t('search:entity.biosample.location.placeholder')}
          errorMessage={t('search:entity.biosample.location.error')}
          validate={validation.isValidRegistrationLocation}
        />
        <CustomCalendar
          id="date"
          value={date as Date | null}
          onChange={(e) => setDate(e.value ?? null)}
          placeholder={t('search:entity.biosample.date.placeholder')}
          className="w-full"
        />
        <CustomFloatLabel
          id="contents"
          value={contents}
          onChange={(e) => setContents(e.target.value)}
          placeholder={t('search:entity.biosample.contents.placeholder')}
          errorMessage={t('search:entity.biosample.contents.error')}
          validate={validation.isValidRegistrationLocation}
        />
        <CustomFloatLabel
          id="sampleNumber"
          value={sampleNumber}
          onChange={(e) => setSampleNumber(e.target.value)}
          placeholder={t('search:entity.biosample.sampleNumber.placeholder')}
          errorMessage={t('search:entity.biosample.sampleNumber.error')}
          validate={validation.isValidRegistrationLocation}
        />
      </div>
      <div className="flex justify-end my-4">
        <SecondaryButton
          label={t('identity:buttons.register')}
          disabled={!isFormValid}
          onClick={() => handleRegister()}
        />
      </div>
    </Panel>
  )
}
