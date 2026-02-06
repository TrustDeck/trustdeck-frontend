import CustomFloatLabel from '@component/form/CustomFloatLabel.tsx'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useTreeStateStore } from '../stores/TreeStateStore'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import { RockerToggle } from '../../../core/components/common/RockerToggle'
import { AlphabetKey, alphabetOptions, characters } from '../utils/alphabetOptions.ts'
import { algorithmOptions } from '../utils/algorithmOptions.ts'
import { getAlgorithmOutputLength, isRandomnessAlgorithm } from '../utils/algorithmOutputLength.ts'
import { psnLengthOptions } from '../utils/psnLengthOptions.ts'
import { findNodeByKey, findNodeByLabel } from '../utils/findNodeByKey.ts'
import type { GroupStoredAttributes } from '../types/CustomTreeNode'
import validation from '../../../core/utils/validation.ts'
import CustomCalendar from '@component/form/CustomCalendar'
import useToastStore from '../../../core/stores/ToastStore.ts'
import { Checkbox } from 'primereact/checkbox'

export default function GroupForm() {
  const [examplePsn, setExamplePsn] = useState<string>('')
  const [parentGroupData, setParentGroupData] = useState<GroupStoredAttributes | null>(null)
  const showToast = useToastStore((state) => state.show)

  const { tree, selectedNodeKey, updateNodeAttribute, moveNode } =
    useTreeStateStore()
  const { t } = useTranslation()

  // Keep parentGroupData in sync with selected parent (from tree)
  const currentParentGroup = findNodeByKey(tree, selectedNodeKey)?.data.temporal.parentgroup
  useEffect(() => {
    if (!currentParentGroup || currentParentGroup === 'ROOT') {
      setParentGroupData(null)
      return
    }
    const parentNode = findNodeByLabel(tree, currentParentGroup)
    setParentGroupData(parentNode?.data?.stored ?? null)
  }, [tree, currentParentGroup])

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
  >([{ label: 'No Parent', value: 'ROOT' }])

  // whenever the tree changes, update the parentGroupOptions array; the default option is always { label: 'No Parent', value: 'ROOT' }
  useEffect(() => {
    const base = [{ label: 'No Parent', value: 'ROOT' }]

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
  }, [tree, selectedNodeKey])

  useEffect(() => {
    const node = findNodeByKey(tree, selectedNodeKey)
    const temporal = node?.data?.temporal
    if (!temporal) return

    function randomLetter(size: number | null, alphabet: AlphabetKey) {
      if (size === null || size <= 0) return ''

      let result = ''
      const charSet = characters[alphabet]

      for (let i = 0; i < size; i++) {
        result += charSet.charAt(Math.floor(Math.random() * charSet.length))
      }
      return result
    }

    const validAlphabet = [
      'HEXADECIMAL_ALPHABET',
      'NUMBERS_ONLY_ALPHABET',
      'LETTERS_ONLY_ALPHABET',
      'LETTERS_AND_NUMBERS_ALPHABET',
      'LETTERS_AND_NUMBERS_WITHOUT_BIOS_ALPHABET',
    ].includes(temporal.alphabet)
      ? (temporal.alphabet as AlphabetKey)
      : 'HEXADECIMAL_ALPHABET'

    const psnlength = Number(temporal.psnlength) || 0
    const prefix = temporal.prefix ?? ''
    const paddingChar = temporal.paddingchar ?? ''
    const checkDigit = temporal.checkdigit

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

    const body = randomLetter(bodyLength, validAlphabet)
    setExamplePsn(`${prefix}${paddingStr}${body}${checkDigit ? '1' : ''}`)
  }, [
    tree,
    selectedNodeKey,
  ])

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
          onChange={(e) => {
            updateNodeAttribute(selectedNodeKey, 'label', e.target.value)
          }}
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
                summary: 'Fehler beim Ändern der Elterngruppe.',
                detail:
                  'Die Elterngruppe darf nicht die Gruppe selbst oder eine eigene Untergruppe sein.',
                life: 4000
              })
              return
            }
            updateNodeAttribute(selectedNodeKey, 'parentgroup', parentName || 'ROOT')
            moveNode(selectedNodeKey, parentName)
            if (parentName) {
              const parentNode = findNodeByLabel(tree, parentName)
              setParentGroupData(parentNode?.data?.stored ?? null)
            } else {
              setParentGroupData(null)
            }
          }}
          options={parentGroupOptions}
        />
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
            }}
            options={psnLengthOptions}
            disabled={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.pseudonymLengthInherited)}
          />
        </div>
        {parentGroupData && (
        <div className="form-grid -mt-4 form-grid--inherit">
          <div />
          <div className="flex align-items-center gap-1.5 text-xs">
            <span className="scale-90 origin-left">
              <Checkbox
                inputId="pseudonymLengthInherited"
                checked={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.pseudonymLengthInherited)}
                onChange={(e) => {
                  const checked = e.checked ?? false
                  if (checked && parentGroupData?.psnlength != null) {
                    updateNodeAttribute(selectedNodeKey, 'psnlength', parentGroupData.psnlength)
                  }
                  updateNodeAttribute(selectedNodeKey, 'pseudonymLengthInherited', checked)
                }}
              />
            </span>
            <label htmlFor="pseudonymLengthInherited" className="cursor-pointer">
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
            onChange={(e) =>
              updateNodeAttribute(
                selectedNodeKey,
                'validFrom',
                formatDate(e.value ?? null)
              )
            }
            placeholder={t('groups:inputs.startdate.label')}
            className="w-full"
            readOnly={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.validFromInherited)}
          />
          <CustomCalendar
            id="enddate"
            dateFormat="mm-dd-yy"
            value={parseDate(
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.validTo
            )}
            onChange={(e) =>
              updateNodeAttribute(
                selectedNodeKey,
                'validTo',
                formatDate(e.value ?? null)
              )
            }
            placeholder={t('groups:inputs.enddate.label')}
            className="w-full"
            readOnly={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.validToInherited)}
          />
        </div>
        {parentGroupData && (
        <div className="form-grid -mt-4 form-grid--inherit">
          <div className="flex align-items-center gap-1.5 text-xs">
            <span className="scale-90 origin-left">
              <Checkbox
                inputId="validFromInherited"
                checked={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.validFromInherited)}
                onChange={(e) => {
                  const checked = e.checked ?? false
                  if (checked && parentGroupData?.validFrom != null) {
                    updateNodeAttribute(selectedNodeKey, 'validFrom', parentGroupData.validFrom)
                  }
                  updateNodeAttribute(selectedNodeKey, 'validFromInherited', checked)
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
                checked={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.validToInherited)}
                onChange={(e) => {
                  const checked = e.checked ?? false
                  if (checked && parentGroupData?.validTo != null) {
                    updateNodeAttribute(selectedNodeKey, 'validTo', parentGroupData.validTo)
                  }
                  updateNodeAttribute(selectedNodeKey, 'validToInherited', checked)
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
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'algorithm', e.value)
          }
          options={algorithmOptions}
          disabled={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithmInherited)}
        />
        {parentGroupData && (
        <div className="flex align-items-center gap-1.5 -mt-4 text-xs form-grid--inherit">
          <span className="scale-90 origin-left">
            <Checkbox
              inputId="algorithmInherited"
              checked={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithmInherited)}
              onChange={(e) => {
                const checked = e.checked ?? false
                if (checked && parentGroupData?.algorithm != null) {
                  updateNodeAttribute(selectedNodeKey, 'algorithm', parentGroupData.algorithm)
                }
                updateNodeAttribute(selectedNodeKey, 'algorithmInherited', checked)
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
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.alphabet}
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'alphabet', e.value)
          }
          options={alphabetOptions}
          helpText={t('groups:inputs.alphabet.help')}
        />
        <CustomFloatLabel
          id="maxnumpsn"
          value={(() => {
            const raw = findNodeByKey(tree, selectedNodeKey)?.data.temporal.maxnumpsn
            if (raw == null || raw === '') return ''
            const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/\D/g, ''))
            return Number.isNaN(num) ? String(raw) : num.toLocaleString()
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
          errorMessage={t('groups:inputs.maxnumpsn.error')}
          validate={validation.isValidRegistrationMaxNumPsn}
        />
        {!isRandomnessAlgorithm(findNodeByKey(tree, selectedNodeKey)?.data.temporal.algorithm) && (
          <>
            <CustomFloatLabel
              id="paddingCharacter"
              placeholder={t('groups:inputs.paddingchar.label')}
              value={(
                findNodeByKey(tree, selectedNodeKey)?.data.temporal.paddingchar ??
                ''
              ).slice(0, 1)}
              onChange={(e) => {
                const val = (e.target.value ?? '').slice(0, 1)
                updateNodeAttribute(selectedNodeKey, 'paddingchar', val)
              }}
              readOnly={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.paddingCharacterInherited)}
            />
            {parentGroupData && (
            <div className="flex align-items-center gap-1.5 -mt-4 text-xs form-grid--inherit">
              <span className="scale-90 origin-left">
                <Checkbox
                  inputId="paddingCharacterInherited"
                  checked={Boolean(findNodeByKey(tree, selectedNodeKey)?.data.temporal.paddingCharacterInherited)}
                  onChange={(e) => {
                    const checked = e.checked ?? false
                    if (checked && parentGroupData?.paddingchar != null) {
                      updateNodeAttribute(selectedNodeKey, 'paddingchar', parentGroupData.paddingchar)
                    }
                    updateNodeAttribute(selectedNodeKey, 'paddingCharacterInherited', checked)
                  }}
                />
              </span>
              <label htmlFor="paddingCharacterInherited" className="cursor-pointer">
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
          onChange={(val) =>
            updateNodeAttribute(selectedNodeKey, 'multiplepsn', val)
          }
        />
        <RockerToggle
          label={t('groups:inputs.checkdigit.label')}
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.checkdigit}
          onChange={(val) =>
            updateNodeAttribute(selectedNodeKey, 'checkdigit', val)
          }
        />
      </form>
    </>
  )
}
