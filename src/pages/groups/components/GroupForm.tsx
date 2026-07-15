import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowPathRoundedSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

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
  getAlgorithmOutputLength,
  isConsecutiveAlgorithm,
  isHashAlgorithm,
  isRandomnessAlgorithm
} from '../utils/algorithmOutputLength'
import { psnLengthOptions } from '../utils/psnLengthOptions'
import { findNodeByKey, findNodeByLabel } from '../utils/findNodeByKey'
import type { GroupStoredAttributes } from '../types/CustomTreeNode'
import validation from '../../../core/utils/validation'
import useToastStore from '../../../core/stores/ToastStore'

const BACKEND_DEFAULT_SALT_LENGTH = '32'
const EMPTY_GROUP_ATTRIBUTES: GroupStoredAttributes = {}

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
  children
}: {
  inherited: boolean
  title: string
  children: ReactNode
}) {
  return (
    <div
      className={`relative rounded-xl ${
        inherited
          ? 'bg-blue-50/70 p-2 ring-1 ring-blue-100 dark:bg-blue-950/30 dark:ring-blue-900'
          : ''
      }`}
    >
      {children}
      {inherited && (
        <span
          title={title}
          aria-label={title}
          className="absolute right-3 top-1 z-20 text-blue-700 dark:text-blue-300"
        >
          <ArrowPathRoundedSquareIcon className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}

export default function GroupForm() {
  const [examplePsn, setExamplePsn] = useState('')
  const [parentGroupData, setParentGroupData] =
    useState<GroupStoredAttributes | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const showToast = useToastStore((state) => state.show)

  const { tree, selectedNodeKey, updateNodeAttribute, moveNode } =
    useTreeStateStore()
  const { t, i18n } = useTranslation(['groups'])
  const desiredPoolSizePlaceholder = formatIntegerForLocale(
    i18n.language,
    1000000
  )
  const desiredSuccessProbabilityPlaceholder = formatDecimalForLocale(
    i18n.language,
    0.99999998
  )
  const inheritedTitle = t('groups:inputs.inheritedEditable')

  const node = findNodeByKey(tree, selectedNodeKey)
  const temporal = node?.data?.temporal ?? EMPTY_GROUP_ATTRIBUTES
  const currentParentGroup = temporal.parentgroup

  useEffect(() => {
    if (!currentParentGroup || currentParentGroup === 'ROOT') {
      setParentGroupData(null)
      return
    }
    const parentNode = findNodeByLabel(tree, currentParentGroup)
    setParentGroupData(parentNode?.data?.stored ?? null)
  }, [tree, currentParentGroup])

  const markFieldOverridden = (flag: keyof GroupStoredAttributes) => {
    updateNodeAttribute(selectedNodeKey, flag, false)
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
    updateNodeAttribute(
      selectedNodeKey,
      'pseudonymLengthInherited',
      hasValue(parent.psnlength)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'algorithmInherited',
      hasValue(parent.algorithm)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'alphabetInherited',
      hasValue(parent.alphabet)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'randomAlgorithmDesiredSizeInherited',
      hasValue(parent.maxnumpsn)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'randomAlgorithmDesiredSuccessProbabilityInherited',
      hasValue(parent.randomAlgorithmDesiredSuccessProbability)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'multiplePsnAllowedInherited',
      parent.multiplepsn !== undefined
    )
    updateNodeAttribute(
      selectedNodeKey,
      'paddingCharacterInherited',
      hasValue(parent.paddingchar)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'addCheckDigitInherited',
      parent.checkdigit !== undefined
    )
    updateNodeAttribute(
      selectedNodeKey,
      'lengthIncludesCheckDigitInherited',
      parent.lengthIncludesCheckDigit !== undefined
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

  const formatDate = (date: Date | null): string | null => {
    if (!date) return null
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const yyyy = String(date.getFullYear())
    return `${mm}-${dd}-${yyyy}`
  }

  const parseDate = (value?: string | null): Date | null => {
    if (!value) return null
    const parts = value.split(/[-/]/)
    if (parts.length !== 3) return null
    const [mm, dd, yyyy] = parts
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
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
      if (Array.isArray(candidate.children)) candidate.children.forEach(traverse)
    }

    traverse(tree)
    setParentGroupOptions(options)
  }, [tree, selectedNodeKey, t])

  useEffect(() => {
    if (!temporal) return

    const randomLetter = (size: number, charSet: string) => {
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
    const psnLength = Number(temporal.psnlength) || 0
    const prefix = temporal.prefix ?? ''
    const paddingCharacter = temporal.paddingchar ?? ''
    const fixedLength = getAlgorithmOutputLength(temporal.algorithm)
    let bodyLength = psnLength
    let padding = ''

    if (fixedLength !== null && fixedLength < psnLength) {
      padding = paddingCharacter.repeat(psnLength - fixedLength)
      bodyLength = fixedLength
    }

    setExamplePsn(`${prefix}${padding}${randomLetter(bodyLength, charSet)}`)
  }, [temporal])

  const changeParent = (parentValue: string) => {
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

    updateNodeAttribute(
      selectedNodeKey,
      'parentgroup',
      parentName || 'ROOT'
    )
    moveNode(selectedNodeKey, parentName)

    if (parentName) {
      const parentNode = findNodeByLabel(tree, parentName)
      const parentData = parentNode?.data?.stored ?? null
      setParentGroupData(parentData)
      applyParentDefaults(parentData)
    } else {
      setParentGroupData(null)
      clearInheritedFlags()
    }
  }

  return (
    <form
      className="w-full space-y-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-5 text-center dark:border-blue-900 dark:bg-blue-950/30">
        <p className="text-base font-semibold text-blue-800 dark:text-blue-200">
          {t('groups:inputs.psnexampleNew')}
        </p>
        <p className="mt-2 break-all font-mono text-2xl font-bold text-blue-950 dark:text-blue-100">
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
            onChange={(event) => changeParent(event.value)}
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
          >
            <CustomDropdown
              id="psnlength"
              placeholder={t('groups:inputs.psnlength.label')}
              value={temporal.psnlength ?? ''}
              onChange={(event) => {
                updateNodeAttribute(selectedNodeKey, 'psnlength', event.value)
                markFieldOverridden('pseudonymLengthInherited')
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
              errorMessage={t('groups:inputs.description.error')}
              validate={validation.isValidRegistrationDescription}
            />
          </div>
        </div>
        {parentGroupData && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
            {t('groups:inputs.inheritedEditable')}
          </p>
        )}
      </SectionCard>

      <SectionCard
        title={t('groups:form.validityTitle')}
        description={t('groups:form.validitySubtitle')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InheritedField
            inherited={Boolean(temporal.validFromInherited)}
            title={inheritedTitle}
          >
            <CustomCalendar
              id="startdate"
              dateFormat="mm-dd-yy"
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
            />
          </InheritedField>
          <InheritedField
            inherited={Boolean(temporal.validToInherited)}
            title={inheritedTitle}
          >
            <CustomCalendar
              id="enddate"
              dateFormat="mm-dd-yy"
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
          >
            <CustomDropdown
              id="algo"
              placeholder={t('groups:inputs.algorithm.label')}
              value={temporal.algorithm ?? ''}
              onChange={(event) => {
                const newAlgorithm = event.value
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
                markFieldOverridden('algorithmInherited')
                markFieldOverridden('alphabetInherited')
              }}
              options={algorithmOptions}
            />
          </InheritedField>
          <InheritedField
            inherited={Boolean(temporal.alphabetInherited)}
            title={inheritedTitle}
          >
            <CustomDropdown
              id="alphabet"
              placeholder={t('groups:inputs.alphabet.label')}
              value={
                isHashAlgorithm(temporal.algorithm)
                  ? 'HEXADECIMAL_ALPHABET'
                  : (temporal.alphabet ?? '')
              }
              onChange={(event) => {
                updateNodeAttribute(selectedNodeKey, 'alphabet', event.value)
                markFieldOverridden('alphabetInherited')
              }}
              options={alphabetOptions}
              helpText={t('groups:inputs.alphabet.help')}
              disabled={isHashAlgorithm(temporal.algorithm)}
            />
          </InheritedField>

          {temporal.alphabet === CUSTOM_ALPHABET_VALUE && (
            <div className="md:col-span-2">
              <InheritedField
                inherited={Boolean(temporal.alphabetInherited)}
                title={inheritedTitle}
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
                    markFieldOverridden('alphabetInherited')
                  }}
                />
              </InheritedField>
            </div>
          )}

          <InheritedField
            inherited={Boolean(temporal.randomAlgorithmDesiredSizeInherited)}
            title={inheritedTitle}
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
                markFieldOverridden('randomAlgorithmDesiredSizeInherited')
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
          >
            <CustomFloatLabel
              id="randomAlgorithmDesiredSuccessProbability"
              value={
                temporal.randomAlgorithmDesiredSuccessProbability ?? ''
              }
              onChange={(event) => {
                updateNodeAttribute(
                  selectedNodeKey,
                  'randomAlgorithmDesiredSuccessProbability',
                  event.target.value
                )
                markFieldOverridden(
                  'randomAlgorithmDesiredSuccessProbabilityInherited'
                )
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
            <CustomFloatLabel
              id="consecutiveValueCounter"
              value={temporal.consecutiveValueCounter ?? '1'}
              onChange={(event) =>
                updateNodeAttribute(
                  selectedNodeKey,
                  'consecutiveValueCounter',
                  event.target.value
                )
              }
              placeholder={t('groups:inputs.consecutiveValueCounter.label')}
              inputPlaceholder="1"
              helpText={t('groups:inputs.consecutiveValueCounter.help')}
              helpIconInside
            />
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
              <CustomFloatLabel
                id="saltLength"
                value={temporal.saltLength ?? BACKEND_DEFAULT_SALT_LENGTH}
                onChange={(event) =>
                  updateNodeAttribute(
                    selectedNodeKey,
                    'saltLength',
                    event.target.value
                  )
                }
                placeholder={t('groups:inputs.saltLength.label')}
                inputPlaceholder={BACKEND_DEFAULT_SALT_LENGTH}
                helpText={t('groups:inputs.saltLength.help')}
                helpIconInside
              />
              <CustomFloatLabel
                id="salt"
                value={temporal.salt ?? ''}
                onChange={(event) =>
                  updateNodeAttribute(
                    selectedNodeKey,
                    'salt',
                    event.target.value
                  )
                }
                placeholder={t('groups:inputs.salt.label')}
                helpText={t('groups:inputs.salt.help')}
                helpIconInside
              />

              {!isRandomnessAlgorithm(temporal.algorithm) && (
                <InheritedField
                  inherited={Boolean(temporal.paddingCharacterInherited)}
                  title={inheritedTitle}
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
                      markFieldOverridden('paddingCharacterInherited')
                    }}
                  />
                </InheritedField>
              )}

              <InheritedField
                inherited={Boolean(temporal.multiplePsnAllowedInherited)}
                title={inheritedTitle}
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
              <InheritedField
                inherited={Boolean(temporal.addCheckDigitInherited)}
                title={inheritedTitle}
              >
                <RockerToggle
                  label={t('groups:inputs.checkdigit.label')}
                  value={Boolean(temporal.checkdigit)}
                  onChange={(value) => {
                    updateNodeAttribute(selectedNodeKey, 'checkdigit', value)
                    markFieldOverridden('addCheckDigitInherited')
                  }}
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(temporal.lengthIncludesCheckDigitInherited)}
                title={inheritedTitle}
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
                    markFieldOverridden('lengthIncludesCheckDigitInherited')
                  }}
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(
                  temporal.enforceStartDateValidityInherited
                )}
                title={inheritedTitle}
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
                    markFieldOverridden(
                      'enforceStartDateValidityInherited'
                    )
                  }}
                />
              </InheritedField>
              <InheritedField
                inherited={Boolean(temporal.enforceEndDateValidityInherited)}
                title={inheritedTitle}
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
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\D/g, ''))
  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString(locale || undefined)
}
