import { useState, useRef } from 'react'
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
import SecondaryButton from '../../../core/components/form/buttons/SecondaryButton'
import { PlusIcon } from '@heroicons/react/24/outline'
import PersonService from '../services/PersonService'
import useDuplicatesStore from '../stores/DuplicatesStore'
import { useNavigate } from 'react-router-dom'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomCalendar from '@component/form/CustomCalendar'
import validation from '../../../core/utils/validation'
import { countryOptions } from '../util/countries'
import { useRelationshipOptions } from '../../../core/utils/relationshipOptions'
import PersonRecordLinkage from '../services/PersonRecordLinkage'
import useProjectStore from '../../../core/stores/ProjectStore'

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
        firstName,
        lastName,
        administrativeGender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
        phoneNumber,
        ...(email ? { email } : {}),
        street,
        houseNumber,
        postalCode,
        city,
        country,
        // only if provided
        ...(contactFirstName ? { contactFirstName } : {}),
        ...(contactLastName ? { contactLastName } : {}),
        ...(contactPhone ? { contactPhone } : {}),
        ...(contactEmail ? { contactEmail } : {}),
        ...(contactRelationship ? { contactRelationship } : {})
      }
    }

    try {
      console.log(payload)
      const recordLinkage = await PersonRecordLinkage.recordLinkage(payload)
      console.log(recordLinkage)

      if (recordLinkage.length > 0) {
        setNewEntry({ ...recordLinkage, matchingEntities: undefined })
        setDuplicates(recordLinkage.matchingEntities)
        navigate('/identity/duplicates')
      } else {
        const createdPerson = await PersonService.create(payload)
        console.log('Person created:', createdPerson)
        navigate(`/person/${createdPerson.trustdeckID}`)
      }
    } catch (error) {
      console.error('Failed to register person:', error)
    }
  }

  const { t } = useTranslation()
  const {
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
    // patientID,
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
    setContactRelationship
  } = useInputStore()

  // Dropdown options for selecting gender
  const genderDropdownOptions = [
    { label: t('identity:entity.gender.male'), value: 'male' },
    { label: t('identity:entity.gender.female'), value: 'female' },
    { label: t('identity:entity.gender.nonBinary'), value: 'Non-binary' }
  ]

  // Dropdown options for selecting relationship
  const relationshipOptions = useRelationshipOptions()

  // function handleSearchPatient() {
  //   console.log('search for patient in KIS happens here')
  // }

  return (
    <Panel>
      <Stepper ref={stepperRef} orientation="vertical">
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
          <p>
            All fields marked with an * are required and must be filled out.
          </p>
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
            <PrimaryOutlinedButton
              label={t('identity:buttons.back')}
              icon={<ArrowUpIcon className="h-5 w-5 mr-1" />}
              onClick={() => handlePrev()}
            />
            <PrimaryButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.next')}
                  <ArrowDownIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => handleNext()}
            />
          </div>
        </StepperPanel>
        <StepperPanel header={t('identity:headers.address')}>
          <p>
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
              label={t('identity:buttons.back')}
              icon={<ArrowUpIcon className="h-5 w-5 mr-1" />}
              onClick={() => handlePrev()}
            />
            <PrimaryButton
              label={
                <span className="flex items-center gap-2">
                  {t('identity:buttons.next')}
                  <ArrowDownIcon className="h-5 w-5" />
                </span>
              }
              onClick={() => handleNext()}
            />
          </div>
        </StepperPanel>
        <StepperPanel header={t('identity:headers.emergencyContact')}>
          <p>
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
            <PrimaryButton
              label={t('identity:buttons.back')}
              icon={<ArrowUpIcon className="h-5 w-5 mr-1" />}
              onClick={() => handlePrev()}
            />
          </div>
        </StepperPanel>
      </Stepper>
      <div className="flex justify-end my-4">
        <SecondaryButton
          label={t('identity:buttons.register')}
          disabled={currentStep === 4 ? false : true}
          onClick={handleRegister}
        />
      </div>
    </Panel>
  )
}
