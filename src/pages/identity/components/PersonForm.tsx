import { useState, useRef, useEffect } from 'react'
import Panel from '../../../core/components/common/Panel'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import useInputStore from '../stores/InputStore'
import { useTranslation } from 'react-i18next'
import { Stepper } from 'primereact/stepper'
import { StepperPanel } from 'primereact/stepperpanel'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import PrimaryOutlinedButton from '../../../core/components/form/buttons/PrimaryOutlinedButton'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
import { ArrowDownIcon } from '@heroicons/react/24/outline'
import { PlusIcon } from '@heroicons/react/24/outline'
import PersonService from '../services/PersonService'
import SearchPersonService from '../../search/services/PersonService'
import useDuplicatesStore from '../stores/DuplicatesStore'
import { useNavigate } from 'react-router-dom'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import validation from '../../../core/utils/validation'
import { countryOptions } from '../util/countries'
import { useRelationshipOptions } from '../../../core/utils/relationshipOptions'
import useProjectStore from '../../../core/stores/ProjectStore'
import useSearchResultsStore from '../../search/stores/SearchResultsStore'
import { Tooltip } from 'primereact/tooltip'
import {
  TrustDeckHttpError,
  type RecordLinkageCandidate
} from '../../../core/services/TrustDeck'

/**
 * The `PersonForm` component renders a multi-step form for creating or registering a person entity.
 *
 * It uses Zustand for managing field states and PrimeReact's `Stepper` component to guide users
 * through a linear flow. The form includes validations for names, emails, and phone numbers,
 * and integrates i18n for internationalization support.
 *
 * Optionally, if the `registration` prop is set to `true`, the first step includes a search section
 * to look up patients by ID to populate their data into the fields.
 *
 * @param {Object} props - The component props.
 * @param {boolean} [props.registration] - Whether the form is used in registration mode, which shows the patient search step.
 *
 * @returns {JSX.Element} The rendered `PersonForm` component.
 */

export default function PersonForm() {
  const stepperRef = useRef<any>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [secondPhoneOption, setSecondPhoneOption] = useState<boolean>(false)
  const [secondEmailOption, setSecondEmailOption] = useState<boolean>(false)
  // TODO: these two are required for the api response to be stored. needs to be implement better somehow
  const { setNewEntry, setDuplicates } = useDuplicatesStore()
  const navigate = useNavigate()
  const { selectedProject } = useProjectStore()
  const { setResults } = useSearchResultsStore()

  function handleNext() {
    setCurrentStep((prevStep) => prevStep + 1)
    stepperRef.current?.nextCallback()
  }

  function handlePrev() {
    setCurrentStep((prevStep) => prevStep - 1)
    stepperRef.current?.prevCallback()
  }

  async function handleRegister() {
    const payload = {
      projectName: selectedProject?.abbreviation,
      entityTypeName: 'person',
      data: {
        id,
        firstName,
        lastName,
        administrativeGender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        phoneNumber,
        email,
        street,
        houseNumber,
        postalCode,
        city,
        country,

        ...(contactFirstName && { contactFirstName }),
        ...(contactLastName && { contactLastName }),
        ...(contactPhone && { contactPhone }),
        ...(contactEmail && { contactEmail }),
        ...(contactRelationship && { contactRelationship })
      }
    }

    try {
      // Entity-level automatic linkage is applied by the backend during creation
      // when it is enabled for the selected entity definition.
      const creationResult = await PersonService.createWithResult(payload)
      const createdPerson = creationResult.entity
      const personData = await SearchPersonService.getPerson(
        createdPerson.trustdeckID
      )
      setResults([personData])
      navigate(`/search/${createdPerson.trustdeckID}`)
    } catch (error) {
      if (error instanceof TrustDeckHttpError && error.status === 409) {
        try {
          const candidates = JSON.parse(error.body) as RecordLinkageCandidate[]
          if (Array.isArray(candidates) && candidates.length > 0) {
            setNewEntry(payload.data as any)
            setDuplicates(
              candidates.map((candidate) => {
                const instance = candidate.entity ?? {}
                const trustdeckID =
                  instance.trustdeckID ??
                  instance.trustdeckId ??
                  instance.trustDeckId ??
                  instance.id ??
                  ''
                const data = instance.data ?? {}
                return {
                  ...data,
                  trustdeckID,
                  identifiers:
                    data.identifiers ??
                    (trustdeckID ? [{ identifier: trustdeckID }] : []),
                  linkageScore: candidate.score,
                  normalizedScore: candidate.normalizedScore,
                  matchedOn: candidate.matchedOn,
                  candidateStatus: candidate.candidateStatus
                }
              })
            )
            navigate('/identity/duplicates')
            return
          }
        } catch {
          // Fall through to the generic error logging below.
        }
      }
      console.error('Failed to register person:', error)
    }
  }

  const { t } = useTranslation()
  const {
    id,
    firstName,
    lastName,
    dateOfBirth,
    administrativeGender,
    phoneNumber,
    secondPhoneNumber,
    email,
    secondEmail,
    street,
    houseNumber,
    city,
    country,
    postalCode,
    contactFirstName,
    contactLastName,
    contactPhone,
    contactEmail,
    contactRelationship,
    setId,
    setFirstName,
    setLastName,
    setDateOfBirth,
    setAdministrativeGender,
    setEmail,
    setSecondEmail,
    setPhoneNumber,
    setSecondPhoneNumber,
    setStreet,
    setHouseNumber,
    setCity,
    setCountry,
    setPostalCode,
    setContactFirstName,
    setContactLastName,
    setContactPhone,
    setContactEmail,
    setContactRelationship,
    reset
  } = useInputStore()

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dropdown options for selecting gender
  const genderDropdownOptions = [
    { label: t('identity:entity.gender.male'), value: 'male' },
    { label: t('identity:entity.gender.female'), value: 'female' },
    { label: t('identity:entity.gender.nonBinary'), value: 'other' },
    { label: t('identity:entity.gender.unknown'), value: 'unknown' }
  ]

  // Dropdown options for selecting relationship
  const relationshipOptions = useRelationshipOptions()

  // function handleSearchPatient() {
  // }

  function isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return (
          !!id &&
          validation.isValidRegistrationName(firstName) &&
          validation.isValidRegistrationName(lastName) &&
          !!dateOfBirth &&
          !!administrativeGender &&
          (!phoneNumber || validation.isValidPhone(phoneNumber)) &&
          (!email || validation.isValidEmail(email)) &&
          (!secondPhoneOption || validation.isValidPhone(secondPhoneNumber)) &&
          (!secondEmailOption || validation.isValidEmail(secondEmail))
        )
      case 2:
        return (
          validation.isValidRegistrationStreet(street) &&
          validation.isValidRegistrationHouseNumber(houseNumber) &&
          validation.isValidRegistrationZip(postalCode) &&
          validation.isValidRegistrationCity(city) &&
          !!country
        )
      case 3:
        return (
          (!contactFirstName || validation.isValidName(contactFirstName)) &&
          (!contactLastName || validation.isValidName(contactLastName)) &&
          (!contactPhone || validation.isValidPhone(contactPhone)) &&
          (!contactEmail || validation.isValidEmail(contactEmail))
        )
      default:
        return false
    }
  }

  return (
    <Panel>
      <Stepper ref={stepperRef} orientation="vertical" linear>
        {/* <StepperPanel header={t('identity:headers.search')}>
          {currentStep === 1 && registration && (
            <>
              <h3 className="mb-2 text-center">
                {t('identity:headers.searchPatient')}
              </h3>
              <div className="flex w-full gap-2 justify-center mb-4">
                <div className="flex gap-3 mt-2">
                  <CustomFloatLabel
                    className="flex-1 w-full"
                    id="patient-id"
                    value={patientID}
                    onChange={(e) => setPatientID(e.target.value)}
                    placeholder={t('identity:entity.person.patientID')}
                  />
                  <PrimaryButton
                    label={
                      <span className="hidden sm:inline">
                        {t('identity:buttons.search')}
                      </span>
                    }
                    className="h-12"
                    icon={<MagnifyingGlassIcon className="w-5 h-5 mr-1" />}
                    onClick={() => handleSearchPatient()}
                  />
                </div>
              </div>
              <Divider text="or" />
              <div className="flex justify-center">
                <PrimaryOutlinedButton
                  label={t('identity:buttons.manually')}
                  onClick={() => {
                    handleNext()
                  }}
                />
              </div>
            </>
          )}
        </StepperPanel> */}
        <StepperPanel header={t('identity:headers.personalData')}>
          <p className="mb-2">
            All fields marked with an * are required and must be filled out.
          </p>
          <div className="sm:space-y-0 space-y-3 mb-5">
            <CustomFloatLabel
              id="id"
              value={id === 0 ? '' : id}
              onChange={(e) => setId(Number(e.target.value))}
              placeholder={'ID'}
              errorMessage={'ID required'}
              required
            />
          </div>
          <div className="sm:form-grid sm:space-y-0 space-y-3">
            <CustomFloatLabel
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('search:entity.person.firstname.placeholder')}
              errorMessage={t('search:entity.person.firstname.error')}
              validate={validation.isValidRegistrationName}
              required
            />
            <CustomFloatLabel
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('search:entity.person.lastname.placeholder')}
              errorMessage={t('search:entity.person.lastname.error')}
              validate={validation.isValidRegistrationName}
              required
            />
            <CustomCalendar
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.value ?? null)}
              placeholder={t('search:entity.person.birthdate.placeholder')}
              className="w-full"
              required
            />
            <CustomDropdown
              id="administrativeGender"
              placeholder={t('search:entity.person.gender.placeholder')}
              value={administrativeGender}
              onChange={(e) => setAdministrativeGender(e.target.value)}
              options={genderDropdownOptions}
              required
            />
            <CustomFloatLabel
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('search:entity.person.phone.placeholder')}
              errorMessage={t('search:entity.person.phone.error')}
              validate={validation.isValidPhone}
            />
            <CustomFloatLabel
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('search:entity.person.email.placeholder')}
              errorMessage={t('search:entity.person.email.error')}
              validate={validation.isValidEmail}
            />
            {secondPhoneOption && (
              <CustomFloatLabel
                id="SecondPhoneNumber"
                value={secondPhoneNumber}
                onChange={(e) => setSecondPhoneNumber(e.target.value)}
                placeholder={t('search:entity.person.secondPhone.placeholder')}
                errorMessage={t('search:entity.person.secondPhone.error')}
                validate={validation.isValidPhone}
              />
            )}
            {secondEmailOption && (
              <CustomFloatLabel
                id="secondEmail"
                value={secondEmail}
                onChange={(e) => setSecondEmail(e.target.value)}
                placeholder={t('search:entity.person.secondEmail.placeholder')}
                errorMessage={t('search:entity.person.secondEmail.error')}
                validate={validation.isValidEmail}
              />
            )}
            {!secondPhoneOption && (
              <PrimaryOutlinedButton
                label={t('identity:entity.person.addPhone')}
                icon={<PlusIcon className="h-6 w-6 mr-1" />}
                onClick={() => setSecondPhoneOption(true)}
              />
            )}
            {!secondEmailOption && (
              <PrimaryOutlinedButton
                label={t('identity:entity.person.addEmail')}
                icon={<PlusIcon className="h-6 w-6 mr-1" />}
                onClick={() => setSecondEmailOption(true)}
              />
            )}
          </div>
          <div className="flex py-4 space-x-4">
            <Tooltip
              target=".next-button-step1"
              content={t('identity:buttons.completeFields')}
              disabled={isStepValid(currentStep)}
            />
            <span className="next-button-step1">
              <PrimaryButton
                label={
                  <span className="flex items-center gap-2">
                    {t('identity:buttons.next')}
                    <ArrowDownIcon className="h-5 w-5" />
                  </span>
                }
                disabled={!isStepValid(currentStep)}
                onClick={() => handleNext()}
              />
            </span>
          </div>
        </StepperPanel>
        <StepperPanel header={t('identity:headers.address')}>
          <p className="mb-2">
            All fields marked with an * are required and must be filled out.
          </p>
          <div className="sm:form-grid sm:space-y-0 space-y-3">
            <CustomFloatLabel
              id="street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder={t('search:entity.person.street.placeholder')}
              errorMessage={t('search:entity.person.street.error')}
              validate={validation.isValidRegistrationStreet}
              required
            />
            <CustomFloatLabel
              id="houseNumber"
              value={houseNumber}
              onChange={(e) => setHouseNumber(e.target.value)}
              placeholder={t('search:entity.person.houseNumber.placeholder')}
              errorMessage={t('search:entity.person.houseNumber.error')}
              validate={validation.isValidRegistrationHouseNumber}
              required
            />
            <CustomFloatLabel
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder={t('search:entity.person.zip.placeholder')}
              errorMessage={t('search:entity.person.zip.error')}
              validate={validation.isValidRegistrationZip}
              required
            />
            <CustomFloatLabel
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t('search:entity.person.city.placeholder')}
              errorMessage={t('search:entity.person.city.error')}
              validate={validation.isValidRegistrationCity}
              required
            />
            <CustomDropdown
              id="country"
              placeholder={t('search:entity.person.country.placeholder')}
              value={country}
              options={countryOptions}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
          </div>
          <div className="flex py-4 space-x-4">
            <PrimaryOutlinedButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.back')}
                  <ArrowUpIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => handlePrev()}
            />
            <Tooltip
              target=".next-button-step2"
              content={t('identity:buttons.completeFields')}
              disabled={isStepValid(currentStep)}
            />
            <span className="next-button-step2">
              <PrimaryButton
                label={
                  <span className="flex items-center gap-2">
                    {t('identity:buttons.next')}
                    <ArrowDownIcon className="h-5 w-5" />
                  </span>
                }
                disabled={!isStepValid(currentStep)}
                onClick={() => handleNext()}
              />
            </span>
          </div>
        </StepperPanel>
        <StepperPanel header={t('identity:headers.emergencyContact')}>
          <p className="mb-2">
            All fields marked with an * are required and must be filled out.
          </p>
          <div className="sm:form-grid sm:space-y-0 space-y-3">
            <CustomFloatLabel
              id="contactFirstname"
              value={contactFirstName}
              onChange={(e) => setContactFirstName(e.target.value)}
              placeholder={t('search:entity.person.firstname.placeholder')}
              errorMessage={t('search:entity.person.firstname.error')}
              validate={validation.isValidName}
            />
            <CustomFloatLabel
              id="contactLastname"
              value={contactLastName}
              onChange={(e) => setContactLastName(e.target.value)}
              placeholder={t('search:entity.person.lastname.placeholder')}
              errorMessage={t('search:entity.person.lastname.error')}
              validate={validation.isValidName}
            />
            <CustomFloatLabel
              id="contactPhone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder={t('search:entity.person.phone.placeholder')}
              errorMessage={t('search:entity.person.phone.error')}
              validate={validation.isValidPhone}
            />
            <CustomFloatLabel
              id="contactEmail"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder={t('search:entity.person.email.placeholder')}
              errorMessage={t('search:entity.person.email.error')}
              validate={validation.isValidEmail}
            />
            <CustomDropdown
              id="relationship"
              placeholder={t('search:entity.person.relationship.placeholder')}
              value={contactRelationship}
              onChange={(e) => setContactRelationship(e.target.value)}
              options={relationshipOptions}
            />
          </div>
          <div className="flex py-4">
            <PrimaryOutlinedButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.back')}
                  <ArrowUpIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => handlePrev()}
            />
          </div>
        </StepperPanel>
      </Stepper>
      <div className="flex justify-end my-4">
        <PrimaryButton
          label={t('identity:buttons.register')}
          disabled={currentStep === 3 ? false : true}
          onClick={handleRegister}
        />
      </div>
    </Panel>
  )
}
