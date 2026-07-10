import CustomFloatLabel from '@component/form/CustomFloatLabel.tsx'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useTreeStateStore } from '../stores/TreeStateStore'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import { RockerToggle } from '../../../core/components/common/RockerToggle'
import {
  AlphabetKey,
  alphabetOptions,
  characters,
  CUSTOM_ALPHABET_VALUE
} from '../utils/alphabetOptions.ts'
import {
  algorithmOptions,
  defaultAlphabetForAlgorithm
} from '../utils/algorithmOptions.ts'
import {
  getAlgorithmOutputLength,
  isConsecutiveAlgorithm,
  isHashAlgorithm,
  isRandomnessAlgorithm
} from '../utils/algorithmOutputLength.ts'
import { psnLengthOptions } from '../utils/psnLengthOptions.ts'
import { findNodeByKey, findNodeByLabel } from '../utils/findNodeByKey.ts'
import type { GroupStoredAttributes } from '../types/CustomTreeNode'
import validation from '../../../core/utils/validation.ts'
import CustomCalendar from '@component/form/CustomCalendar'
import useToastStore from '../../../core/stores/ToastStore.ts'
import { Checkbox } from 'primereact/checkbox'

const BACKEND_DEFAULT_SALT_LENGTH = '32'

const formatIntegerForLocale = (locale: string | undefined, value: number) =>
  new Intl.NumberFormat(locale || undefined, {
    maximumFractionDigits: 0
  }).format(value)

const formatDecimalForLocale = (locale: string | undefined, value: number) =>
  new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }).format(value)

const INHERITABLE_GROUP_FIELDS: Array<keyof GroupStoredAttributes> = [
  'prefix',
  'psnlength',
  'validFrom',
  'validTo',
  'validityTime',
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
  'enforceEndDateValidity',
  'consecutiveValueCounter',
  'salt',
  'saltLength',
  'description'
]

export default function GroupForm() {
  const [examplePsn, setExamplePsn] = useState<string>('')
  const [parentGroupData, setParentGroupData] =
    useState<GroupStoredAttributes | null>(null)
  const showToast = useToastStore((state) => state.show)

  const { tree, selectedNodeKey, updateNodeAttribute, moveNode } =
    useTreeStateStore()
  const { t, i18n } = useTranslation()
  const desiredPoolSizePlaceholder = formatIntegerForLocale(
    i18n.language,
    1000000
  )
  const desiredSuccessProbabilityPlaceholder = formatDecimalForLocale(
    i18n.language,
    0.999
  )

  // Keep parentGroupData in sync with selected parent (from tree)
  const currentParentGroup = findNodeByKey(tree, selectedNodeKey)?.data.temporal
    .parentgroup
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

  const applyParentDefaults = (parent: GroupStoredAttributes | null) => {
    if (!parent) return
    INHERITABLE_GROUP_FIELDS.forEach((field) => {
      const value = parent[field]
      if (value !== undefined && value !== null && value !== '') {
        updateNodeAttribute(selectedNodeKey, field, value as any)
      }
    })
    updateNodeAttribute(
      selectedNodeKey,
      'validFromInherited',
      Boolean(parent.validFrom)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'validToInherited',
      Boolean(parent.validTo)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'pseudonymLengthInherited',
      Boolean(parent.psnlength)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'algorithmInherited',
      Boolean(parent.algorithm)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'alphabetInherited',
      Boolean(parent.alphabet)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'randomAlgorithmDesiredSizeInherited',
      Boolean(parent.maxnumpsn)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'randomAlgorithmDesiredSuccessProbabilityInherited',
      Boolean(parent.randomAlgorithmDesiredSuccessProbability)
    )
    updateNodeAttribute(
      selectedNodeKey,
      'multiplePsnAllowedInherited',
      parent.multiplepsn !== undefined
    )
    updateNodeAttribute(
      selectedNodeKey,
      'paddingCharacterInherited',
      Boolean(parent.paddingchar)
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

  // Hash algorithms require hex alphabet; normalize when algorithm is hash but alphabet is not
  const node = findNodeByKey(tree, selectedNodeKey)
  const temporal = node?.data?.temporal
  useEffect(() => {
    if (!selectedNodeKey || !temporal) return
    if (
      isHashAlgorithm(temporal.algorithm) &&
      temporal.alphabet !== 'HEXADECIMAL_ALPHABET'
    ) {
      updateNodeAttribute(selectedNodeKey, 'alphabet', 'HEXADECIMAL_ALPHABET')
    }
  }, [selectedNodeKey, temporal, updateNodeAttribute])

  // helpers to format and parse mm-dd-yy
  const formatDate = (date: Date | null): string | null => {
    if (!date) return null
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const yy = String(date.getFullYear())

    return `${mm}-${dd}-${yy}`
  }

  const parseDate = (s?: string | null): Date | null => {
    if (!s) return null
    // accept mm-dd-yy or mm/dd/yyyy or mm-dd-yyyy
    const sep = '-'
    const parts = s.split(sep)
    if (parts.length < 3) return null
    const [mm, dd, yy] = parts
    const year = Number(yy)
    const month = Number(mm) - 1
    const day = Number(dd)
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null
    }

    return new Date(year, month, day)
  }

  const [parentGroupOptions, setParentGroupOptions] = useState<
    { label: string; value: string }[]
  >([{ label: t('groups:inputs.parentgroup.none'), value: 'ROOT' }])

  // whenever the tree changes, update the parentGroupOptions array; the default option is always { label: 'No Parent', value: 'ROOT' }
  useEffect(() => {
    const base = [{ label: t('groups:inputs.parentgroup.none'), value: 'ROOT' }]

    const traverse = (node: any) => {
      if (!node) return
      if (Array.isArray(node)) {
        node.forEach(traverse)
        return
      }

      const label = findNodeByKey(tree, selectedNodeKey)?.label
      if (label != node.label) {
        base.push({ label: node.label, value: node.label })
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(traverse)
      }
    }

    traverse(tree)
    setParentGroupOptions(base)
  }, [tree, selectedNodeKey, t])

  useEffect(() => {
    const node = findNodeByKey(tree, selectedNodeKey)
    const temporal = node?.data?.temporal
    if (!temporal) return

    function randomLetter(size: number | null, charSet: string) {
      if (size === null || size <= 0 || !charSet) return ''

      let result = ''
      for (let i = 0; i < size; i++) {
        result += charSet.charAt(Math.floor(Math.random() * charSet.length))
      }
      return result
    }

    const charSet =
      temporal.alphabet === CUSTOM_ALPHABET_VALUE
        ? (temporal.customAlphabetCharacters ?? '')
        : (characters[temporal.alphabet as AlphabetKey] ??
          characters.HEXADECIMAL_ALPHABET)

    const psnlength = Number(temporal.psnlength) || 0
    const prefix = temporal.prefix ?? ''
    const paddingChar = temporal.paddingchar ?? ''

    const fixedLength = getAlgorithmOutputLength(temporal.algorithm)
    let paddingStr = ''
    let bodyLength = psnlength

    if (fixedLength === null) {
      // Randomness-based: output is always psnlength, no padding
      paddingStr = ''
      bodyLength = psnlength
    } else if (fixedLength < psnlength) {
      // Hash shorter than desired: pad to psnlength
      paddingStr = paddingChar.repeat(psnlength - fixedLength)
      bodyLength = fixedLength
    }
    // else: hash length >= psnlength, no padding

    const body = randomLetter(bodyLength, charSet)
    setExamplePsn(`${prefix}${paddingStr}${body}`)
  }, [tree, selectedNodeKey])

  return (
    <>
      <div className="flex flex-col items-center">
        <h4 className="mb-3">{t('groups:inputs.psnexampleNew')}</h4>
        <h2 className="border-4 border-solid rounded-md border-black px-14 py-8">
          {examplePsn.length > 15
            ? `${examplePsn.slice(0, 15)}...`
            : examplePsn}
        </h2>
      </div>
      <form
        className="w-full flex flex-col space-y-5"
        onSubmit={(e) => e.preventDefault()}
      >
        <CustomFloatLabel
          id="name"
          value={findNodeByKey(tree, selectedNodeKey)?.label ?? ''}
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'label', e.target.value)
          }
          placeholder={t('groups:inputs.groupname.label')}
          errorMessage={t('groups:inputs.groupname.error')}
          validate={validation.isValidRegistrationGroupName}
        />
        <CustomDropdown
          id="parentgroup"
          placeholder={t('groups:inputs.parentgroup.label')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.parentgroup ??
            'ROOT'
          }
          onChange={(e) => {
            const parentName = e.value === 'ROOT' ? '' : e.value
            const isChild = (
              nodeKey: string,
              potentialChildKey: string
            ): boolean => {
              const node = findNodeByKey(tree, nodeKey)
              if (!node || !node.children) return false
              for (const child of node.children) {
                if (String(child.key) === String(potentialChildKey)) return true
                if (isChild(String(child.key), potentialChildKey)) return true
              }
              return false
            }
            const isSame =
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.label ===
              parentName
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
            }
          }}
          options={parentGroupOptions}
        />
        {parentGroupData && (
          <p className="-mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            {t('groups:inputs.inheritedEditable')}
          </p>
        )}
        <div className="form-grid">
          <CustomFloatLabel
            id="prefix"
            value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.prefix}
            onChange={(e) =>
              updateNodeAttribute(selectedNodeKey, 'prefix', e.target.value)
            }
            placeholder={t('groups:inputs.prefix.label')}
            errorMessage={t('groups:inputs.prefix.error')}
            validate={validation.isValidRegistrationPrefix}
          />
          <CustomDropdown
            id="psnlength"
            placeholder={t('groups:inputs.psnlength.label')}
            value={
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.psnlength
            }
            onChange={(e) => {
              updateNodeAttribute(selectedNodeKey, 'psnlength', e.value)
              markFieldOverridden('pseudonymLengthInherited')
            }}
            options={psnLengthOptions}
          />
        </div>
        {parentGroupData && (
          <div className="form-grid -mt-4 form-grid--inherit">
            <div />
            <div className="flex align-items-center gap-1.5 text-xs">
              <span className="scale-90 origin-left">
                <Checkbox
                  inputId="pseudonymLengthInherited"
                  checked={Boolean(
                    findNodeByKey(tree, selectedNodeKey)?.data.temporal
                      .pseudonymLengthInherited
                  )}
                  onChange={(e) => {
                    const checked = e.checked ?? false
                    if (checked && parentGroupData?.psnlength != null) {
                      updateNodeAttribute(
                        selectedNodeKey,
                        'psnlength',
                        parentGroupData.psnlength
                      )
                    }
                    updateNodeAttribute(
                      selectedNodeKey,
                      'pseudonymLengthInherited',
                      checked
                    )
                  }}
                />
              </span>
              <label
                htmlFor="pseudonymLengthInherited"
                className="cursor-pointer"
              >
                {t('groups:inputs.inheritFromParent')}
              </label>
            </div>
          </div>
        )}
        <div className="form-grid">
          <CustomCalendar
            id="startdate"
            dateFormat="mm-dd-yy"
            value={parseDate(
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.validFrom
            )}
            onChange={(e) => {
              updateNodeAttribute(
                selectedNodeKey,
                'validFrom',
                formatDate(e.value ?? null)
              )
              markFieldOverridden('validFromInherited')
            }}
            placeholder={t('groups:inputs.startdate.label')}
            className="w-full"
          />
          <CustomCalendar
            id="enddate"
            dateFormat="mm-dd-yy"
            value={parseDate(
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.validTo
            )}
            onChange={(e) => {
              updateNodeAttribute(
                selectedNodeKey,
                'validTo',
                formatDate(e.value ?? null)
              )
              markFieldOverridden('validToInherited')
            }}
            placeholder={t('groups:inputs.enddate.label')}
            className="w-full"
          />
        </div>
        {parentGroupData && (
          <div className="form-grid -mt-4 form-grid--inherit">
            <div className="flex align-items-center gap-1.5 text-xs">
              <span className="scale-90 origin-left">
                <Checkbox
                  inputId="validFromInherited"
                  checked={Boolean(
                    findNodeByKey(tree, selectedNodeKey)?.data.temporal
                      .validFromInherited
                  )}
                  onChange={(e) => {
                    const checked = e.checked ?? false
                    if (checked && parentGroupData?.validFrom != null) {
                      updateNodeAttribute(
                        selectedNodeKey,
                        'validFrom',
                        parentGroupData.validFrom
                      )
                    }
                    updateNodeAttribute(
                      selectedNodeKey,
                      'validFromInherited',
                      checked
                    )
                  }}
                />
              </span>
              <label htmlFor="validFromInherited" className="cursor-pointer">
                {t('groups:inputs.inheritFromParent')}
              </label>
            </div>
            <div className="flex align-items-center gap-1.5 text-xs">
              <span className="scale-90 origin-left">
                <Checkbox
                  inputId="validToInherited"
                  checked={Boolean(
                    findNodeByKey(tree, selectedNodeKey)?.data.temporal
                      .validToInherited
                  )}
                  onChange={(e) => {
                    const checked = e.checked ?? false
                    if (checked && parentGroupData?.validTo != null) {
                      updateNodeAttribute(
                        selectedNodeKey,
                        'validTo',
                        parentGroupData.validTo
                      )
                    }
                    updateNodeAttribute(
                      selectedNodeKey,
                      'validToInherited',
                      checked
                    )
                  }}
                />
              </span>
              <label htmlFor="validToInherited" className="cursor-pointer">
                {t('groups:inputs.inheritFromParent')}
              </label>
            </div>
          </div>
        )}
        <CustomFloatLabel
          id="validityTime"
          placeholder={t('groups:inputs.validityTime.label')}
          inputPlaceholder={t('groups:inputs.validityTime.placeholder')}
          helpText={t('groups:inputs.validityTime.help')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.validityTime ??
            ''
          }
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'validityTime', e.target.value)
          }
        />
        <CustomFloatLabel
          id="description"
          placeholder={t('groups:inputs.description.label')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.description
          }
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'description', e.target.value)
          }
          errorMessage={t('groups:inputs.description.error')}
          validate={validation.isValidRegistrationDescription}
        />
        <CustomDropdown
          id="algo"
          placeholder={t('groups:inputs.algorithm.label')}
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm}
          onChange={(e) => {
            const newAlgorithm = e.value
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
          }}
          options={algorithmOptions}
        />
        {parentGroupData && (
          <div className="flex align-items-center gap-1.5 -mt-4 text-xs form-grid--inherit">
            <span className="scale-90 origin-left">
              <Checkbox
                inputId="algorithmInherited"
                checked={Boolean(
                  findNodeByKey(tree, selectedNodeKey)?.data.temporal
                    .algorithmInherited
                )}
                onChange={(e) => {
                  const checked = e.checked ?? false
                  if (checked && parentGroupData?.algorithm != null) {
                    updateNodeAttribute(
                      selectedNodeKey,
                      'algorithm',
                      parentGroupData.algorithm
                    )
                  }
                  updateNodeAttribute(
                    selectedNodeKey,
                    'algorithmInherited',
                    checked
                  )
                }}
              />
            </span>
            <label htmlFor="algorithmInherited" className="cursor-pointer">
              {t('groups:inputs.inheritFromParent')}
            </label>
          </div>
        )}
        <CustomDropdown
          id="alphabet"
          placeholder={t('groups:inputs.alphabet.label')}
          value={
            isHashAlgorithm(
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm
            )
              ? 'HEXADECIMAL_ALPHABET'
              : findNodeByKey(tree, selectedNodeKey)?.data.temporal.alphabet
          }
          onChange={(e) => {
            updateNodeAttribute(selectedNodeKey, 'alphabet', e.value)
            markFieldOverridden('alphabetInherited')
          }}
          options={alphabetOptions}
          helpText={t('groups:inputs.alphabet.help')}
          disabled={isHashAlgorithm(
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm
          )}
        />
        {findNodeByKey(tree, selectedNodeKey)?.data.temporal.alphabet ===
          CUSTOM_ALPHABET_VALUE && (
          <CustomFloatLabel
            id="customAlphabetCharacters"
            placeholder={t('groups:inputs.customAlphabetChars.label')}
            inputPlaceholder={t(
              'groups:inputs.customAlphabetChars.placeholder',
              'e.g. abcdefghijklmno1234,.-*+'
            )}
            helpText={t(
              'groups:inputs.customAlphabetChars.help',
              'Enter every character that may appear in generated pseudonyms. This is a literal character list, not a regular expression.'
            )}
            value={
              findNodeByKey(tree, selectedNodeKey)?.data.temporal
                .customAlphabetCharacters ?? ''
            }
            onChange={(e) =>
              updateNodeAttribute(
                selectedNodeKey,
                'customAlphabetCharacters',
                e.target.value
              )
            }
          />
        )}
        <CustomFloatLabel
          id="maxnumpsn"
          value={(() => {
            const raw = findNodeByKey(tree, selectedNodeKey)?.data.temporal
              .maxnumpsn
            if (raw == null || raw === '') return ''
            const num =
              typeof raw === 'number'
                ? raw
                : Number(String(raw).replace(/\D/g, ''))
            return Number.isNaN(num)
              ? String(raw)
              : num.toLocaleString(i18n.language || undefined)
          })()}
          onChange={(e) => {
            const filtered = e.target.value.replace(/\D/g, '')
            updateNodeAttribute(
              selectedNodeKey,
              'maxnumpsn',
              filtered ? Number(filtered) : 0
            )
          }}
          placeholder={t('groups:inputs.maxnumpsn.label')}
          inputPlaceholder={desiredPoolSizePlaceholder}
          errorMessage={t('groups:inputs.maxnumpsn.error')}
          helpText={t('groups:inputs.maxnumpsn.help')}
          validate={validation.isValidRegistrationMaxNumPsn}
        />
        <CustomFloatLabel
          id="randomAlgorithmDesiredSuccessProbability"
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal
              .randomAlgorithmDesiredSuccessProbability ?? ''
          }
          onChange={(e) =>
            updateNodeAttribute(
              selectedNodeKey,
              'randomAlgorithmDesiredSuccessProbability',
              e.target.value
            )
          }
          placeholder={t(
            'groups:inputs.randomAlgorithmDesiredSuccessProbability.label'
          )}
          inputPlaceholder={desiredSuccessProbabilityPlaceholder}
          helpText={t(
            'groups:inputs.randomAlgorithmDesiredSuccessProbability.help'
          )}
        />
        {isConsecutiveAlgorithm(
          findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm
        ) && (
          <CustomFloatLabel
            id="consecutiveValueCounter"
            value={
              findNodeByKey(tree, selectedNodeKey)?.data.temporal
                .consecutiveValueCounter ?? '1'
            }
            onChange={(e) =>
              updateNodeAttribute(
                selectedNodeKey,
                'consecutiveValueCounter',
                e.target.value
              )
            }
            placeholder={t('groups:inputs.consecutiveValueCounter.label')}
            inputPlaceholder="1"
            helpText={t('groups:inputs.consecutiveValueCounter.help')}
          />
        )}
        <CustomFloatLabel
          id="saltLength"
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.saltLength ??
            BACKEND_DEFAULT_SALT_LENGTH
          }
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'saltLength', e.target.value)
          }
          placeholder={t('groups:inputs.saltLength.label')}
          inputPlaceholder={BACKEND_DEFAULT_SALT_LENGTH}
          helpText={t('groups:inputs.saltLength.help')}
        />
        <CustomFloatLabel
          id="salt"
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.salt ?? ''}
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'salt', e.target.value)
          }
          placeholder={t('groups:inputs.salt.label')}
          helpText={t('groups:inputs.salt.help')}
        />
        {!isRandomnessAlgorithm(
          findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm
        ) && (
          <>
            <CustomFloatLabel
              id="paddingCharacter"
              placeholder={t('groups:inputs.paddingchar.label')}
              value={(
                findNodeByKey(tree, selectedNodeKey)?.data.temporal
                  .paddingchar ?? ''
              ).slice(0, 1)}
              onChange={(e) => {
                const val = (e.target.value ?? '').slice(0, 1)
                updateNodeAttribute(selectedNodeKey, 'paddingchar', val)
                markFieldOverridden('paddingCharacterInherited')
              }}
            />
            {parentGroupData && (
              <div className="flex align-items-center gap-1.5 -mt-4 text-xs form-grid--inherit">
                <span className="scale-90 origin-left">
                  <Checkbox
                    inputId="paddingCharacterInherited"
                    checked={Boolean(
                      findNodeByKey(tree, selectedNodeKey)?.data.temporal
                        .paddingCharacterInherited
                    )}
                    onChange={(e) => {
                      const checked = e.checked ?? false
                      if (checked && parentGroupData?.paddingchar != null) {
                        updateNodeAttribute(
                          selectedNodeKey,
                          'paddingchar',
                          parentGroupData.paddingchar
                        )
                      }
                      updateNodeAttribute(
                        selectedNodeKey,
                        'paddingCharacterInherited',
                        checked
                      )
                    }}
                  />
                </span>
                <label
                  htmlFor="paddingCharacterInherited"
                  className="cursor-pointer"
                >
                  {t('groups:inputs.inheritFromParent')}
                </label>
              </div>
            )}
          </>
        )}
        <RockerToggle
          label={t('groups:inputs.multiplepsn.label')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.multiplepsn
          }
          onChange={(val) => {
            updateNodeAttribute(selectedNodeKey, 'multiplepsn', val)
            markFieldOverridden('multiplePsnAllowedInherited')
          }}
        />
        <RockerToggle
          label={t('groups:inputs.checkdigit.label')}
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.checkdigit}
          onChange={(val) => {
            updateNodeAttribute(selectedNodeKey, 'checkdigit', val)
            markFieldOverridden('addCheckDigitInherited')
          }}
        />
        <RockerToggle
          label={t('groups:inputs.lengthIncludesCheckDigit.label')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal
              .lengthIncludesCheckDigit
          }
          onChange={(val) => {
            updateNodeAttribute(
              selectedNodeKey,
              'lengthIncludesCheckDigit',
              val
            )
            markFieldOverridden('lengthIncludesCheckDigitInherited')
          }}
        />
      </form>
    </>
  )
}
