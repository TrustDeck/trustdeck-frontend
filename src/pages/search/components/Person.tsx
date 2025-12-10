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
import { PersonType } from 'core/types/PersonEntity'
import { Entity } from '../types/Entity'

interface PersonProps {
  entity: PersonEntity
  editMode: boolean
}

const Person: React.FC<PersonProps> = ({ entity, editMode = false }) => {
  const { t } = useTranslation()

  const {
    lastname,
    firstname,
    birthdate,
    gender,
    email,
    phone,
    street,
    houseNumber,
    city,
    country,
    zip,
    contactPerson,
    identifiers,
    setLastname,
    setFirstname,
    setBirthdate,
    setGender,
    setEmail,
    setPhone,
    setStreet,
    setHouseNumber,
    setCity,
    setCountry,
    setZip,
    setContactFirstname,
    setContactLastname,
    setContactEmail,
    setContactPhone,
    setRelationship,
    setId,
    setMOI,
    loadEntity
  } = usePersonStore()

  useEffect(() => {
    if (editMode) {

      //convert PersonEntity to PersonType
      loadEntity(entity as unknown as PersonType) //TODO dirty fix, needs proper mapping
    }
  }, [editMode, entity, loadEntity])

  const genderDropdownOptions = [
    { label: t('identity:entity.gender.male'), value: 'Male' },
    { label: t('identity:entity.gender.female'), value: 'Female' },
    { label: t('identity:entity.gender.nonBinary'), value: 'Non-binary' }
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
              value={firstname}
              placeholder={t('search:entity.person.firstname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setFirstname(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
            <CustomFloatLabel
              id="lastname"
              value={lastname}
              placeholder={t('search:entity.person.lastname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setLastname(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
          </div>
          <div className="flex space-x-3">
            {editMode ? (
              <div className="flex-1">
                <CustomCalendar
                  id="birthdate"
                  placeholder={t('search:entity.person.birthdate.placeholder')}
                  value={birthdate ? new Date(birthdate) : null}
                  onChange={(e) =>
                    setBirthdate(
                      e.value ? e.value.toISOString().split('T')[0] : ''
                    )
                  }
                />
              </div>
            ) : (
              <CustomFloatLabel
                id="birthdate"
                value={entity.birthdate.split('T')[0]}
                placeholder={t('search:entity.person.birthdate.placeholder')}
                readOnly
                className="flex-1"
              />
            )}

            {editMode ? (
              <div className="flex flex-col flex-1">
                <CustomDropdown
                  id="gender"
                  placeholder={t('search:entity.person.gender.placeholder')}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  options={genderDropdownOptions}
                  textColor="text-gray-700"
                  className="w-full"
                />
              </div>
            ) : (
              <CustomFloatLabel
                id="gender"
                value={gender}
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
              value={phone}
              placeholder={t('search:entity.person.phone.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setPhone(e.target.value)}
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
              value={zip}
              placeholder={t('search:entity.person.zip.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setZip(e.target.value)}
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
              id="contactFirstname"
              value={contactPerson.firstname}
              placeholder={t('search:entity.person.firstname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContactFirstname(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
            <CustomFloatLabel
              id="contactLastname"
              value={contactPerson.lastname}
              placeholder={t('search:entity.person.lastname.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setContactLastname(e.target.value)}
              validate={validation.isValidRegistrationName}
            />
          </div>
          <CustomFloatLabel
            id="contactEmail"
            value={contactPerson.email}
            placeholder={t('search:entity.person.email.placeholder')}
            readOnly={!editMode}
            onChange={(e) => setContactEmail(e.target.value)}
            validate={validation.isValidRegistrationEmail}
          />
          <CustomFloatLabel
            id="contactPhone"
            value={contactPerson.phone}
            placeholder={t('search:entity.person.phone.placeholder')}
            readOnly={!editMode}
            onChange={(e) => setContactPhone(e.target.value)}
            validate={validation.isValidRegistrationPhone}
          />
          {editMode ? (
            <div className="flex flex-col flex-1">
              <CustomDropdown
                id="relationship"
                placeholder={t('search:entity.person.relationship.placeholder')}
                value={contactPerson.relationship}
                onChange={(e) => setRelationship(e.target.value)}
                options={relationshipOptions}
                textColor="text-gray-700"
                className="w-full mb-8"
              />
            </div>
          ) : (
            <CustomFloatLabel
              id="relationship"
              value={contactPerson.relationship}
              placeholder={t('search:entity.person.relationship.placeholder')}
              readOnly={!editMode}
              onChange={(e) => setRelationship(e.target.value)}
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
            value={identifiers.id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ID"
            readOnly={!editMode}
          />
          <CustomFloatLabel
            id="MOI"
            value={identifiers.MOI}
            onChange={(e) => setMOI(e.target.value)}
            placeholder="Master Object Index"
            className="mb-8"
            readOnly={!editMode}
          />
        </div>
      </Panel>
    </div>
  )
}

export default Person
