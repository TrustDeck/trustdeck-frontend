import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

import CustomFloatLabel from '@component/form/CustomFloatLabel'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import CustomCalendar from '@component/form/CustomCalendar'
import { RockerToggle } from '../../../core/components/common/RockerToggle'
import { useTreeStateStore } from '../stores/TreeStateStore'
import {
  AlphabetKey,
  alphabetOptions,
  characters,
  CUSTOM_ALPHABET_VALUE
} from '../utils/alphabetOptions'
import {
  algorithmOptions,
  defaultAlphabetForAlgorithm
} from '../utils/algorithmOptions'
import {
  isConsecutiveAlgorithm,
  isHashAlgorithm,
  isRandomnessAlgorithm
} from '../utils/algorithmOutputLength'
import { psnLengthOptions } from '../utils/psnLengthOptions'
import { findNodeByKey, findNodeByLabel } from '../utils/findNodeByKey'
import type { GroupStoredAttributes } from '../types/CustomTreeNode'
import validation from '../../../core/utils/validation'
import useToastStore from '../../../core/stores/ToastStore'
import InheritanceIndicator from '../../../core/components/common/InheritanceIndicator'
import DomainService from '../services/DomainService'

const BACKEND_DEFAULT_SALT_LENGTH = '32'
const EMPTY_GROUP_ATTRIBUTES: GroupStoredAttributes = {}

const FIXED_RANDOM_ALGORITHMS = new Set([
  'RANDOM_NUM',
  'RANDOM_HEX',
  'RANDOM_LET',
  'RANDOM_SYM',
  'RANDOM_SYM_BIOS'
])

const formatIntegerForLocale = (locale: string | undefined, value: number) =>
  new Intl.NumberFormat(locale || undefined, {
    maximumFractionDigits: 0
  }).format(value)

const formatDecimalForLocale = (locale: string | undefined, value: number) =>
  new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }).format(value)

const INHERITABLE_VALUE_FIELDS: Array<keyof GroupStoredAttributes> = [
  'psnlength',
  'validFrom',
  'validTo',
  'algorithm',
  'alphabet',
  'customAlphabetCharacters',
  'maxnumpsn',
  'randomAlgorithmDesiredSuccessProbability',
  'consecutiveValueCounter',
  'salt',
  'saltLength',
  'multiplepsn',
  'paddingchar',
  'checkdigit',
  'lengthIncludesCheckDigit',
  'enforceStartDateValidity',
  'enforceEndDateValidity'
]

const INHERITED_FLAGS: Array<keyof GroupStoredAttributes> = [
  'validFromInherited',
  'validToInherited',
  'pseudonymLengthInherited',
  'algorithmInherited',
  'alphabetInherited',
  'randomAlgorithmDesiredSizeInherited',
  'randomAlgorithmDesiredSuccessProbabilityInherited',
  'multiplePsnAllowedInherited',
  'paddingCharacterInherited',
  'addCheckDigitInherited',
  'lengthIncludesCheckDigitInherited',
  'enforceStartDateValidityInherited',
  'enforceEndDateValidityInherited'
]

const ALGORITHM_INHERITED_FLAGS: Array<keyof GroupStoredAttributes> = [
  'algorithmInherited',
  'alphabetInherited',
  'randomAlgorithmDesiredSizeInherited',
  'randomAlgorithmDesiredSuccessProbabilityInherited',
  'pseudonymLengthInherited',
  'paddingCharacterInherited',
  'addCheckDigitInherited',
  'lengthIncludesCheckDigitInherited'
]

function SectionCard({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5">
        <h3 className="td-section-title !mb-0">{title}</h3>
        <p className="td-section-subtitle mt-1">{description}</p>
      </div>
      {children}
    </section>
  )
}

function InheritedField({
  inherited,
  title,
  children,
  iconClassName = 'right-3 top-1/2 -translate-y-1/2'
}: {
  inherited: boolean
  title: string
  children: ReactNode
  iconClassName?: string
}) {
  return (
    <div className={`relative ${inherited ? 'td-inherited-field' : ''}`}>
      {children}
      {inherited && (
        <InheritanceIndicator
          title={title}
          className={`absolute z-30 text-lg ${iconClassName}`}
        />
      )}
    </div>
  )
}

export default function DomainForm() {
  const [examplePsn, setExamplePsn] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [alphabetSelectionError, setAlphabetSelectionError] = useState(false)
  const showToast = useToastStore((state) => state.show)

  const { tree, selectedNodeKey, updateNodeAttribute, moveNode } =
    useTreeStateStore()
  const { t, i18n } = useTranslation(['groups'])
  const desiredPoolSizePlaceholder = formatIntegerForLocale(
    i18n.language,
    100000000
  )
  const desiredSuccessProbabilityPlaceholder = formatDecimalForLocale(
    i18n.language,
    0.99999998
  )
  const inheritedTitle = t('groups:inputs.inheritedEditable')

  const node = findNodeByKey(tree, selectedNodeKey)
  const temporal = node?.data?.temporal ?? EMPTY_GROUP_ATTRIBUTES
  const normalizedAlgorithm = String(temporal.algorithm ?? '').toUpperCase()
  const fixedRandomAlphabet =
    FIXED_RANDOM_ALGORITHMS.has(normalizedAlgorithm) ||
    isConsecutiveAlgorithm(normalizedAlgorithm)
      ? defaultAlphabetForAlgorithm(normalizedAlgorithm)
      : null
  const alphabetIsCompatible =
    !fixedRandomAlphabet || temporal.alphabet === fixedRandomAlphabet

  useEffect(() => {
    if (
      isConsecutiveAlgorithm(temporal.algorithm) &&
      temporal.alphabet !== 'NUMBERS_ONLY_ALPHABET'
    ) {
      updateNodeAttribute(selectedNodeKey, 'alphabet', 'NUMBERS_ONLY_ALPHABET')
      setAlphabetSelectionError(false)
    }
  }, [
    selectedNodeKey,
    temporal.algorithm,
    temporal.alphabet,
    updateNodeAttribute
  ])

  const markFieldOverridden = (flag: keyof GroupStoredAttributes) => {
    updateNodeAttribute(selectedNodeKey, flag, false)
  }

  const markAlgorithmOverridden = () => {
    ALGORITHM_INHERITED_FLAGS.forEach((flag) =>
      updateNodeAttribute(selectedNodeKey, flag, false)
    )
  }

  const clearInheritedFlags = () => {
    INHERITED_FLAGS.forEach((flag) =>
      updateNodeAttribute(selectedNodeKey, flag, false)
    )
  }

  const applyParentDefaults = (parent: GroupStoredAttributes | null) => {
    if (!parent) return
    INHERITABLE_VALUE_FIELDS.forEach((field) => {
      const value = parent[field]
      if (value !== undefined && value !== null && value !== '') {
        updateNodeAttribute(selectedNodeKey, field, value as never)
      }
    })
    updateNodeAttribute(
      selectedNodeKey,
      'validFromInherited',
      hasValue(parent.validFrom)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'validToInherited',
      hasValue(parent.validTo)
    )
    const inheritsAlgorithm = hasValue(parent.algorithm)
    ALGORITHM_INHERITED_FLAGS.forEach((flag) =>
      updateNodeAttribute(selectedNodeKey, flag, inheritsAlgorithm)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'multiplePsnAllowedInherited',
      parent.multiplepsn !== undefined
    )
    updateNodeAttribute(
      selectedNodeKey,
      'enforceStartDateValidityInherited',
      parent.enforceStartDateValidity !== undefined
    )
    updateNodeAttribute(
      selectedNodeKey,
      'enforceEndDateValidityInherited',
      parent.enforceEndDateValidity !== undefined
    )
  }

  useEffect(() => {
    if (!selectedNodeKey || !temporal) return
    if (
      isHashAlgorithm(temporal.algorithm) &&
      temporal.alphabet !== 'HEXADECIMAL_ALPHABET'
    ) {
      updateNodeAttribute(selectedNodeKey, 'alphabet', 'HEXADECIMAL_ALPHABET')
    }
  }, [selectedNodeKey, temporal, updateNodeAttribute])

  useEffect(() => {
    if (alphabetIsCompatible) setAlphabetSelectionError(false)
  }, [alphabetIsCompatible])

  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
  }

  const parseDate = (value?: string | null): Date | null => {
    if (!value) return null

    const isoDate = new Date(value)
    if (!Number.isNaN(isoDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return isoDate
    }

    const match = value
      .trim()
      .match(
        /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
      )
    if (!match) return null

    const [, day, month, year, hours = '0', minutes = '0', seconds = '0'] =
      match
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  const [parentGroupOptions, setParentGroupOptions] = useState<
    { label: string; value: string }[]
  >([{ label: t('groups:inputs.parentgroup.none'), value: 'ROOT' }])

  useEffect(() => {
    const options = [
      { label: t('groups:inputs.parentgroup.none'), value: 'ROOT' }
    ]
    const selectedLabel = findNodeByKey(tree, selectedNodeKey)?.label

    const traverse = (candidate: any) => {
      if (!candidate) return
      if (Array.isArray(candidate)) {
        candidate.forEach(traverse)
        return
      }
      if (selectedLabel !== candidate.label) {
        options.push({ label: candidate.label, value: candidate.label })
      }
      if (Array.isArray(candidate.children))
        candidate.children.forEach(traverse)
    }

    traverse(tree)
    setParentGroupOptions(options)
  }, [tree, selectedNodeKey, t])

  useEffect(() => {
    if (!temporal) return

    const randomCharacters = (size: number, charSet: string) => {
      if (size <= 0 || !charSet) return ''
      let result = ''
      for (let index = 0; index < size; index += 1) {
        result += charSet.charAt(Math.floor(Math.random() * charSet.length))
      }
      return result
    }

    const charSet =
      temporal.alphabet === CUSTOM_ALPHABET_VALUE
        ? (temporal.customAlphabetCharacters ?? '')
        : (characters[temporal.alphabet as AlphabetKey] ??
          characters.HEXADECIMAL_ALPHABET)
    const selectedLength = Math.max(Number(temporal.psnlength) || 0, 0)
    const includesCheckDigit =
      Boolean(temporal.checkdigit) &&
      Boolean(temporal.lengthIncludesCheckDigit) &&
      selectedLength > 0
    const bodyLength = includesCheckDigit ? selectedLength - 1 : selectedLength
    const body = randomCharacters(bodyLength, charSet)
    const fakeCheckDigit = temporal.checkdigit
      ? randomCharacters(1, charSet)
      : ''

    setExamplePsn(`${temporal.prefix ?? ''}${body}${fakeCheckDigit}`)
  }, [temporal])

  const changeParent = async (parentValue: string) => {
    const parentName = parentValue === 'ROOT' ? '' : parentValue

    const isChild = (nodeKey: string, potentialChildKey: string): boolean => {
      const currentNode = findNodeByKey(tree, nodeKey)
      if (!currentNode?.children) return false
      return currentNode.children.some(
        (child) =>
          String(child.key) === String(potentialChildKey) ||
          isChild(String(child.key), potentialChildKey)
      )
    }

    const isSame = temporal.label === parentName
    if (isChild(selectedNodeKey, parentName) || isSame) {
      showToast({
        severity: 'error',
        summary: t('groups:messages.invalidParentSummary'),
        detail: t('groups:messages.invalidParentDetail'),
        life: 4000
      })
      return
    }

    updateNodeAttribute(selectedNodeKey, 'parentgroup', parentName || 'ROOT')
    moveNode(selectedNodeKey, parentName)

    if (parentName) {
      const parentNode = findNodeByLabel(tree, parentName)
      let parentData = parentNode?.data?.stored ?? null

      try {
        const parentDomain = await DomainService.getGroup(parentName)
        parentData = DomainService.normalizeGroup(
          parentDomain,
          parentDomain.superDomainName ?? null
        )
      } catch {
        // Keep the hierarchy values when complete parent access is unavailable.
      }

      applyParentDefaults(parentData)
    } else {
      clearInheritedFlags()
    }
  }

  return (
    <form
      className="w-full space-y-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-center dark:border-amber-800 dark:bg-amber-950/30">
        <p className="text-base font-semibold text-amber-800 dark:text-amber-200">
          {t('groups:inputs.psnexampleNew')}
        </p>
        <p className="mt-2 break-all font-mono text-2xl font-bold text-amber-950 dark:text-amber-100">
          {examplePsn || '—'}
        </p>
      </div>

      <SectionCard
        title={t('groups:form.basicTitle')}
        description={t('groups:form.basicSubtitle')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <CustomFloatLabel
            id="name"
            value={node?.label ?? ''}
            onChange={(event) =>
              updateNodeAttribute(selectedNodeKey, 'label', event.target.value)
            }
            placeholder={t('groups:inputs.groupname.label')}
            errorMessage={t('groups:inputs.groupname.error')}
            validate={validation.isValidRegistrationGroupName}
            required
          />
          <CustomDropdown
            id="parentgroup"
            placeholder={t('groups:inputs.parentgroup.label')}
            value={temporal.parentgroup ?? 'ROOT'}
            onChange={(event) => void changeParent(event.value)}
            options={parentGroupOptions}
          />
          <CustomFloatLabel
            id="prefix"
            value={temporal.prefix ?? ''}
            onChange={(event) =>
              updateNodeAttribute(selectedNodeKey, 'prefix', event.target.value)
            }
            placeholder={t('groups:inputs.prefix.label')}
            errorMessage={t('groups:inputs.prefix.error')}
            validate={validation.isValidRegistrationPrefix}
            required
          />
          <InheritedField
            inherited={Boolean(temporal.pseudonymLengthInherited)}
            title={inheritedTitle}
            iconClassName="right-10 top-1/2 -translate-y-1/2"
          >
            <CustomDropdown
              id="psnlength"
              placeholder={t('groups:inputs.psnlength.label')}
              value={temporal.psnlength ?? ''}
              onChange={(event) => {
                updateNodeAttribute(selectedNodeKey, 'psnlength', event.value)
                markAlgorithmOverridden()
              }}
              options={psnLengthOptions}
            />
          </InheritedField>
          <div className="md:col-span-2">
            <CustomFloatLabel
              id="description"
              placeholder={t('groups:inputs.description.label')}
              value={temporal.description ?? ''}
              onChange={(event) =>
                updateNodeAttribute(
                  selectedNodeKey,
                  'description',
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('groups:form.validityTitle')}
        description={t('groups:form.validitySubtitle')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InheritedField
            inherited={Boolean(temporal.validFromInherited)}
            title={inheritedTitle}
            iconClassName="right-[4.5rem] top-1/2 -translate-y-1/2"
          >
            <CustomCalendar
              id="startdate"
              dateFormat="dd.mm.yy"
              value={parseDate(temporal.validFrom)}
              onChange={(event) => {
                updateNodeAttribute(
                  selectedNodeKey,
                  'validFrom',
                  formatDate(event.value)
                )
                markFieldOverridden('validFromInherited')
              }}
              placeholder={t('groups:inputs.startdate.label')}
              className="w-full"
              showTime
              showSeconds
              hourFormat="24"
            />
          </InheritedField>
          <InheritedField
            inherited={Boolean(temporal.validToInherited)}
            title={inheritedTitle}
            iconClassName="right-[4.5rem] top-1/2 -translate-y-1/2"
          >
            <CustomCalendar
              id="enddate"
              dateFormat="dd.mm.yy"
              value={parseDate(temporal.validTo)}
              onChange={(event) => {
                updateNodeAttribute(
                  selectedNodeKey,
                  'validTo',
                  formatDate(event.value)
                )
                markFieldOverridden('validToInherited')
              }}
              placeholder={t('groups:inputs.enddate.label')}
              className="w-full"
              showTime
              showSeconds
              hourFormat="24"
            />
          </InheritedField>
          <div className="md:col-span-2">
            <CustomFloatLabel
              id="validityTime"
              placeholder={t('groups:inputs.validityTime.label')}
              inputPlaceholder={t('groups:inputs.validityTime.placeholder')}
              helpText={t('groups:inputs.validityTime.help')}
              helpIconInside
              value={temporal.validityTime ?? ''}
              onChange={(event) =>
                updateNodeAttribute(
                  selectedNodeKey,
                  'validityTime',
                  event.target.value
                )
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t('groups:form.generationTitle')}
        description={t('groups:form.generationSubtitle')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InheritedField
            inherited={Boolean(temporal.algorithmInherited)}
            title={inheritedTitle}
            iconClassName="right-10 top-1/2 -translate-y-1/2"
          >
            <CustomDropdown
              id="algo"
              placeholder={t('groups:inputs.algorithm.label')}
              value={temporal.algorithm ?? ''}
              onChange={(event) => {
                const newAlgorithm = event.value
                setAlphabetSelectionError(false)
                updateNodeAttribute(selectedNodeKey, 'algorithm', newAlgorithm)
                updateNodeAttribute(
                  selectedNodeKey,
                  'alphabet',
                  defaultAlphabetForAlgorithm(newAlgorithm)
                )
                if (!isConsecutiveAlgorithm(newAlgorithm)) {
                  updateNodeAttribute(
                    selectedNodeKey,
                    'consecutiveValueCounter',
                    '1'
                  )
                }
                markAlgorithmOverridden()
              }}
              options={algorithmOptions}
            />
          </InheritedField>
          <InheritedField
            inherited={Boolean(temporal.alphabetInherited)}
            title={inheritedTitle}
            iconClassName="right-[4.75rem] top-1/2 -translate-y-1/2"
          >
            <CustomDropdown
              id="alphabet"
              placeholder={t('groups:inputs.alphabet.label')}
              value={
                isConsecutiveAlgorithm(temporal.algorithm)
                  ? 'NUMBERS_ONLY_ALPHABET'
                  : isHashAlgorithm(temporal.algorithm)
                    ? 'HEXADECIMAL_ALPHABET'
                    : (temporal.alphabet ?? '')
              }
              onChange={(event) => {
                if (
                  fixedRandomAlphabet &&
                  event.value !== fixedRandomAlphabet
                ) {
                  setAlphabetSelectionError(true)
                  return
                }
                setAlphabetSelectionError(false)
                updateNodeAttribute(selectedNodeKey, 'alphabet', event.value)
                markAlgorithmOverridden()
              }}
              options={alphabetOptions}
              helpText={t('groups:inputs.alphabet.help')}
              invalid={alphabetSelectionError || !alphabetIsCompatible}
              errorMessage={t('groups:inputs.alphabet.fixedAlgorithmError')}
              disabled={
                isHashAlgorithm(temporal.algorithm) ||
                isConsecutiveAlgorithm(temporal.algorithm)
              }
            />
          </InheritedField>

          {temporal.alphabet === CUSTOM_ALPHABET_VALUE && (
            <div className="md:col-span-2">
              <InheritedField
                inherited={Boolean(temporal.alphabetInherited)}
                title={inheritedTitle}
                iconClassName="right-10 top-1/2 -translate-y-1/2"
              >
                <CustomFloatLabel
                  id="customAlphabetCharacters"
                  placeholder={t('groups:inputs.customAlphabetChars.label')}
                  inputPlaceholder={t(
                    'groups:inputs.customAlphabetChars.placeholder'
                  )}
                  helpText={t('groups:inputs.customAlphabetChars.help')}
                  helpIconInside
                  value={temporal.customAlphabetCharacters ?? ''}
                  onChange={(event) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'customAlphabetCharacters',
                      event.target.value
                    )
                    markAlgorithmOverridden()
                  }}
                />
              </InheritedField>
            </div>
          )}

          <InheritedField
            inherited={Boolean(temporal.randomAlgorithmDesiredSizeInherited)}
            title={inheritedTitle}
            iconClassName="right-10 top-1/2 -translate-y-1/2"
          >
            <CustomFloatLabel
              id="maxnumpsn"
              value={formatLocalizedInteger(temporal.maxnumpsn, i18n.language)}
              onChange={(event) => {
                const filtered = event.target.value.replace(/\D/g, '')
                updateNodeAttribute(
                  selectedNodeKey,
                  'maxnumpsn',
                  filtered ? Number(filtered) : ''
                )
                markAlgorithmOverridden()
              }}
              placeholder={t('groups:inputs.maxnumpsn.label')}
              inputPlaceholder={desiredPoolSizePlaceholder}
              errorMessage={t('groups:inputs.maxnumpsn.error')}
              helpText={t('groups:inputs.maxnumpsn.help')}
              helpIconInside
              validate={validation.isValidRegistrationMaxNumPsn}
            />
          </InheritedField>
          <InheritedField
            inherited={Boolean(
              temporal.randomAlgorithmDesiredSuccessProbabilityInherited
            )}
            title={inheritedTitle}
            iconClassName="right-10 top-1/2 -translate-y-1/2"
          >
            <CustomFloatLabel
              id="randomAlgorithmDesiredSuccessProbability"
              value={temporal.randomAlgorithmDesiredSuccessProbability ?? ''}
              onChange={(event) => {
                updateNodeAttribute(
                  selectedNodeKey,
                  'randomAlgorithmDesiredSuccessProbability',
                  event.target.value
                )
                markAlgorithmOverridden()
              }}
              placeholder={t(
                'groups:inputs.randomAlgorithmDesiredSuccessProbability.label'
              )}
              inputPlaceholder={desiredSuccessProbabilityPlaceholder}
              helpText={t(
                'groups:inputs.randomAlgorithmDesiredSuccessProbability.help'
              )}
              helpIconInside
            />
          </InheritedField>

          {isConsecutiveAlgorithm(temporal.algorithm) && (
            <InheritedField
              inherited={Boolean(temporal.algorithmInherited)}
              title={inheritedTitle}
              iconClassName="right-10 top-1/2 -translate-y-1/2"
            >
              <CustomFloatLabel
                id="consecutiveValueCounter"
                value={temporal.consecutiveValueCounter ?? '1'}
                onChange={(event) => {
                  updateNodeAttribute(
                    selectedNodeKey,
                    'consecutiveValueCounter',
                    event.target.value
                  )
                  markAlgorithmOverridden()
                }}
                placeholder={t('groups:inputs.consecutiveValueCounter.label')}
                inputPlaceholder="1"
                helpText={t('groups:inputs.consecutiveValueCounter.help')}
                helpIconInside
              />
            </InheritedField>
          )}
        </div>
      </SectionCard>

      <section className="rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          className="flex w-full items-center justify-between px-5 py-4 text-left text-lg font-semibold text-blue-900 dark:text-blue-200"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          <span>{t('groups:form.advancedTitle')}</span>
          {showAdvanced ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
        {showAdvanced && (
          <div className="border-t border-gray-200 p-5 dark:border-slate-700">
            <p className="td-section-subtitle mb-5">
              {t('groups:form.advancedSubtitle')}
            </p>
            <div className="grid gap-5 md:grid-cols-2">
              <InheritedField
                inherited={Boolean(temporal.algorithmInherited)}
                title={inheritedTitle}
                iconClassName="right-10 top-1/2 -translate-y-1/2"
              >
                <CustomFloatLabel
                  id="saltLength"
                  value={temporal.saltLength ?? BACKEND_DEFAULT_SALT_LENGTH}
                  onChange={(event) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'saltLength',
                      event.target.value
                    )
                    markAlgorithmOverridden()
                  }}
                  placeholder={t('groups:inputs.saltLength.label')}
                  inputPlaceholder={BACKEND_DEFAULT_SALT_LENGTH}
                  helpText={t('groups:inputs.saltLength.help')}
                  helpIconInside
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(temporal.algorithmInherited)}
                title={inheritedTitle}
                iconClassName="right-10 top-1/2 -translate-y-1/2"
              >
                <CustomFloatLabel
                  id="salt"
                  value={temporal.salt ?? ''}
                  onChange={(event) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'salt',
                      event.target.value
                    )
                    markAlgorithmOverridden()
                  }}
                  placeholder={t('groups:inputs.salt.label')}
                  helpText={t('groups:inputs.salt.help')}
                  helpIconInside
                />
              </InheritedField>

              {!isRandomnessAlgorithm(temporal.algorithm) && (
                <div className="md:col-span-2">
                  <InheritedField
                    inherited={Boolean(temporal.paddingCharacterInherited)}
                    title={inheritedTitle}
                    iconClassName="right-3 top-1/2 -translate-y-1/2"
                  >
                    <CustomFloatLabel
                      id="paddingCharacter"
                      placeholder={t('groups:inputs.paddingchar.label')}
                      value={(temporal.paddingchar ?? '').slice(0, 1)}
                      onChange={(event) => {
                        updateNodeAttribute(
                          selectedNodeKey,
                          'paddingchar',
                          event.target.value.slice(0, 1)
                        )
                        markAlgorithmOverridden()
                      }}
                    />
                  </InheritedField>
                </div>
              )}

              <InheritedField
                inherited={Boolean(temporal.addCheckDigitInherited)}
                title={inheritedTitle}
                iconClassName="right-3 top-3"
              >
                <RockerToggle
                  label={t('groups:inputs.checkdigit.label')}
                  value={Boolean(temporal.checkdigit)}
                  onChange={(value) => {
                    updateNodeAttribute(selectedNodeKey, 'checkdigit', value)
                    markAlgorithmOverridden()
                  }}
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(temporal.lengthIncludesCheckDigitInherited)}
                title={inheritedTitle}
                iconClassName="right-3 top-3"
              >
                <RockerToggle
                  label={t('groups:inputs.lengthIncludesCheckDigit.label')}
                  value={Boolean(temporal.lengthIncludesCheckDigit)}
                  onChange={(value) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'lengthIncludesCheckDigit',
                      value
                    )
                    markAlgorithmOverridden()
                  }}
                />
              </InheritedField>

              <InheritedField
                inherited={Boolean(temporal.enforceStartDateValidityInherited)}
                title={inheritedTitle}
                iconClassName="right-3 top-3"
              >
                <RockerToggle
                  label={t('groups:inputs.enforceStartDateValidity.label')}
                  value={Boolean(temporal.enforceStartDateValidity)}
                  onChange={(value) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'enforceStartDateValidity',
                      value
                    )
                    markFieldOverridden('enforceStartDateValidityInherited')
                  }}
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(temporal.enforceEndDateValidityInherited)}
                title={inheritedTitle}
                iconClassName="right-3 top-3"
              >
                <RockerToggle
                  label={t('groups:inputs.enforceEndDateValidity.label')}
                  value={Boolean(temporal.enforceEndDateValidity)}
                  onChange={(value) => {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'enforceEndDateValidity',
                      value
                    )
                    markFieldOverridden('enforceEndDateValidityInherited')
                  }}
                />
              </InheritedField>

              <div className="md:col-span-2">
                <InheritedField
                  inherited={Boolean(temporal.multiplePsnAllowedInherited)}
                  title={inheritedTitle}
                  iconClassName="right-3 top-3"
                >
                  <RockerToggle
                    label={t('groups:inputs.multiplepsn.label')}
                    value={Boolean(temporal.multiplepsn)}
                    onChange={(value) => {
                      updateNodeAttribute(selectedNodeKey, 'multiplepsn', value)
                      markFieldOverridden('multiplePsnAllowedInherited')
                    }}
                  />
                </InheritedField>
              </div>
            </div>
          </div>
        )}
      </section>
    </form>
  )
}

function hasValue(value: unknown) {
  return value !== undefined && value !== null && value !== ''
}

function formatLocalizedInteger(
  value: GroupStoredAttributes['maxnumpsn'],
  locale: string
) {
  if (value === undefined || value === null || value === '') return ''
  const numberValue =
    typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString(locale || undefined)
}
