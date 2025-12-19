import React from 'react'
import { useEffect } from 'react'
import Panel from '../../../core/components/common/Panel'
import Divider from '../../../core/components/common/Divider'
import LinksTable from './LinksTable'
import { useTranslation } from 'react-i18next'
import usePersonStore from '../stores/PersonStore'
import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '@component/form/CustomDropdown'
import CustomCalendar from '@component/form/CustomCalendar'
import validation from '../../../core/utils/validation'
import { countryOptions } from '../../identity/util/countries'
import { useRelationshipOptions } from '../../../core/utils/relationshipOptions'
import { PersonEntity } from '../types/PersonEntity'
// import { PersonType } from 'core/types/PersonEntity'
import { Entity } from '../types/Entity'

interface PersonProps {
  entity: PersonEntity
  editMode: boolean
}

const Person: React.FC<PersonProps> = ({ entity, editMode = false }) => {
  const { t } = useTranslation()

  const {
    id,
    lastName,
    firstName,
    dateOfBirth,
    administrativeGender,
    email,
    phoneNumber,
    street,
    houseNumber,
    city,
    country,
    postalCode,
    trustdeckID,
    contactFirstName,
    contactLastName,
    contactPhone,
    contactEmail,
    contactRelationship,
    setLastName,
    setFirstName,
    setDateOfBirth,
    setAdministrativeGender,
    setEmail,
    setPhoneNumber,
    setStreet,
    setHouseNumber,
    setCity,
    setCountry,
    setPostalCode,
    setContactFirstName,
    setContactLastName,
    setContactEmail,
    setContactPhone,
    setContactRelationship,
    loadEntity
  } = usePersonStore()

  useEffect(() => {
    if (editMode) {
      console.log('editMode')
      loadEntity(entity)
    }
  }, [editMode, entity, loadEntity])

  const genderDropdownOptions = [
    { label: t('identity:entity.gender.male'), value: 'male' },
    { label: t('identity:entity.gender.female'), value: 'female' },
    { label: t('identity:entity.gender.nonBinary'), value: 'other' }
  ]

  const countryLabel = countryOptions.find((c) => c.value === country)?.label || country
  const relationshipOptions = useRelationshipOptions()

  return (
    <div className="space-y-8 lg:space-y-0 lg:w-full lg:flex lg:space-x-4 2xl:w-4/5 2xl:mx-auto">
      <Panel
        title={t('search:headers.personalData')}
        className="flex-1"
        noMaxWidth
      >
        <Divider />
        <div className="space-y-5">
          <div className="flex space-x-3">
            <CustomFloatLabel
              id="firstname"
              value={firstName}
              placeholder={t('search:entity.person.firstname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setFirstName(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
            <CustomFloatLabel
              id="lastname"
              value={lastName}
              placeholder={t('search:entity.person.lastname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setLastName(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
          </div>
          <div className="flex space-x-3">
            {editMode ? (
              <div className="flex-1">
                <CustomCalendar
                  id="birthdate"
                  placeholder={t('search:entity.person.birthdate.placeholder')}
                  value={dateOfBirth ? new Date(dateOfBirth) : null}
                  onChange={(e) =>
                    setDateOfBirth(
                      e.value ? e.value.toISOString().split('T')[0] : ''
                    )
                  }
                />
              </div>
            ) : (
              <CustomFloatLabel
                id="birthdate"
                value={entity.data.dateOfBirth.split('T')[0]}
                placeholder={t('search:entity.person.birthdate.placeholder')}
                readOnly
                className="flex-1"
              />
            )}

            {editMode ? (
              <div className="flex flex-col flex-1">
                <CustomDropdown
                  id="administrativeGender"
                  placeholder={t('search:entity.person.gender.placeholder')}
                  value={administrativeGender}
                  onChange={(e) => setAdministrativeGender(e.value)}
                  options={genderDropdownOptions}
                  textColor="text-gray-700"
                  className="w-full"
                />
              </div>
            ) : (
              <CustomFloatLabel
                id="administrativeGender"
                value={administrativeGender}
                placeholder={t('search:entity.person.gender.placeholder')}
                readOnly
                className="flex-1"
              />
            )}
          </div>
          <CustomFloatLabel
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('search:entity.person.email.placeholder')}
            className="w-full"
            validate={validation.isValidRegistrationEmail}
          />
          <CustomFloatLabel
              id="phone"
              value={phoneNumber}
              placeholder={t('search:entity.person.phone.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setPhoneNumber(e.target.value)}
              validate={validation.isValidRegistrationPhone}
            />
        </div>

        <h2 className="mt-4">{t('search:headers.address')}</h2>
        <Divider />
        <div className="space-y-5">
          <div className="flex space-x-3">
            <CustomFloatLabel
              id="street"
              value={street}
              placeholder={t('search:entity.person.street.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setStreet(e.target.value)}
              validate={validation.isValidRegistrationStreet}
            />
            <CustomFloatLabel
              id="houseNumber"
              value={houseNumber}
              placeholder={t('search:entity.person.houseNumber.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setHouseNumber(e.target.value)}
              validate={validation.isValidRegistrationHouseNumber}
            />
          </div>
          <div className="flex space-x-3">
            <CustomFloatLabel
              id="zip"
              value={postalCode}
              placeholder={t('search:entity.person.zip.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setPostalCode(e.target.value)}
              validate={validation.isValidRegistrationZip}
            />
            <CustomFloatLabel
              id="city"
              value={city}
              placeholder={t('search:entity.person.city.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setCity(e.target.value)}
              validate={validation.isValidRegistrationCity}
            />
          </div>
          {editMode ? (
            <div className="flex flex-col flex-1">
              <CustomDropdown
                id="country"
                placeholder={t('search:entity.person.country.placeholder')}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                options={countryOptions}
                textColor="text-gray-700"
                className="w-full"
              />
            </div>
          ) : (
            <CustomFloatLabel
              id="country"
              value={countryLabel}
              placeholder={t('search:entity.person.country.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setCountry(e.target.value)}
            />
          )}
        </div>

        <h2 className="mt-4">{t('search:headers.emergencyContact')}</h2>
        <Divider />
        <div className="space-y-5">
          <div className="flex space-x-3">
            <CustomFloatLabel
              id="contactFirstName"
              value={contactFirstName}
              placeholder={t('search:entity.person.firstname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContactFirstName(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
            <CustomFloatLabel
              id="contactLastName"
              value={contactLastName}
              placeholder={t('search:entity.person.lastname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContactLastName(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
          </div>
          <CustomFloatLabel
            id="contactEmail"
            value={contactEmail}
            placeholder={t('search:entity.person.email.placeholder')}
            readOnly={!editMode}
            onChange={(e) => setContactEmail(e.target.value)}
            validate={validation.isValidRegistrationEmail}
          />
          <CustomFloatLabel
            id="contactPhone"
            value={contactPhone}
            placeholder={t('search:entity.person.phone.placeholder')}
            readOnly={!editMode}
            onChange={(e) => setContactPhone(e.target.value)}
            validate={validation.isValidRegistrationPhone}
          />
          {editMode ? (
            <div className="flex flex-col flex-1">
              <CustomDropdown
                id="contactRelationship"
                placeholder={t('search:entity.person.relationship.placeholder')}
                value={contactRelationship}
                onChange={(e) => setContactRelationship(e.target.value)}
                options={relationshipOptions}
                textColor="text-gray-700"
                className="w-full mb-8"
              />
            </div>
          ) : (
            <CustomFloatLabel
              id="relationship"
              value={contactRelationship}
              placeholder={t('search:entity.person.relationship.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContactRelationship(e.target.value)}
              className="mb-8"
            />
          )}
        </div>
      </Panel>

      <Panel title={t('search:headers.links')} className="flex-1" noMaxWidth>
        <Divider />
        <div className="w-full overflow-auto">
          <LinksTable entity={entity as unknown as Entity} />
        </div>

        <h2 className="mt-8">{t('search:headers.identifiers')}</h2>
        <Divider />
        <div className="space-y-5">
          <CustomFloatLabel
            id="id"
            value={id}
            // onChange={(e) => setId(e.target.value)}
            placeholder="ID"
            readOnly={!editMode}
          />
          {/* <CustomFloatLabel
            id="MOI"
            value={identifiers.MOI}
            onChange={(e) => setMOI(e.target.value)}
            placeholder="Master Object Index"
            className="mb-8"
            readOnly={!editMode}
          /> */}
        </div>
      </Panel>
    </div>
  )
}

export default Person
