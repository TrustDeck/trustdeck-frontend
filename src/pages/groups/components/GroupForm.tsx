import CustomFloatLabel from '@component/form/CustomFloatLabel.tsx'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useTreeStateStore } from '../stores/TreeStateStore'
import CustomDropdown from '../../../core/components/form/CustomDropdown'
import { RockerToggle } from '../../../core/components/common/RockerToggle'
import { AlphabetKey, alphabetOptions, characters } from '../utils/alphabetOptions.ts'
import { algorithmOptions } from '../utils/algorithmOptions.ts'
import { psnLengthOptions } from '../utils/psnLengthOptions.ts'
import { findNodeByKey } from '../utils/findNodeByKey.ts'
import validation from '../../../core/utils/validation.ts'
import { Calendar } from 'primereact/calendar'
import useToastStore from '../../../core/stores/ToastStore.ts'

export default function GroupForm() {
  const [examplePsn, setExamplePsn] = useState<string>('')
  const showToast = useToastStore((state) => state.show)

  const { tree, selectedNodeKey, updateNodeAttribute, moveNode } =
    useTreeStateStore()
  const { t } = useTranslation()

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
    ].includes(findNodeByKey(tree, selectedNodeKey)?.data.temporal.alphabet)
      ? (findNodeByKey(tree, selectedNodeKey)?.data.temporal
          .alphabet as AlphabetKey)
      : 'HEXADECIMAL_ALPHABET'  
    const string = randomLetter(
      Number(findNodeByKey(tree, selectedNodeKey)?.data.temporal.psnlength),
      validAlphabet
    )

    const paddingChar = findNodeByKey(tree, selectedNodeKey)?.data.temporal
      .paddingchar

    const checkDigit = findNodeByKey(tree, selectedNodeKey)?.data.temporal
      .checkdigit

    setExamplePsn(
      `${findNodeByKey(tree, selectedNodeKey)?.data.temporal.prefix}${paddingChar}${paddingChar}${string}${checkDigit ? '1' : ''}`
    )
  }, [
    findNodeByKey(tree, selectedNodeKey)?.data.temporal.prefix,
    findNodeByKey(tree, selectedNodeKey)?.data.temporal.psnlength,
    findNodeByKey(tree, selectedNodeKey)?.data.temporal.alphabet,
    findNodeByKey(tree, selectedNodeKey)?.data.temporal.paddingchar,
    findNodeByKey(tree, selectedNodeKey)?.data.temporal.checkdigit
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
          />
        </div>
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
        <div className="form-grid">
          <Calendar
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
            inputClassName="rounded-lg font-normal border-color-light-gray text-xl text-gray-500"
          />
          <Calendar
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
            }}
            placeholder={t('groups:inputs.enddate.label')}
            className="w-full"
            inputClassName="rounded-lg font-normal border-color-light-gray text-xl text-gray-500"
          />
        </div>
        <CustomDropdown
          id="parentgroup"
          placeholder={t('groups:inputs.parentgroup.label')}
          value={
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.parentgroup
          }
          onChange={(e) => {
            let parentName = e.value
            if (e.value === 'ROOT') {
              parentName = ''
            }
            //before moving and updating the parentgroup attribute look if the new parentgroup is not a child of the selected node to avoid circular references if so console.error and return
            const isChild = (
              nodeKey: string,
              potentialChildKey: string
            ): boolean => {
              const node = findNodeByKey(tree, nodeKey)
              if (!node || !node.children) return false
              for (const child of node.children) {
                if (String(child.key) === String(potentialChildKey)) {
                  return true
                }
                if (isChild(String(child.key), potentialChildKey)) {
                  return true
                }
              }
              return false
            }

            //also check if the selectedNodeKey is not equal to the parentName to avoid setting itself as parent
            const isSame =
              findNodeByKey(tree, selectedNodeKey)?.data.temporal.label ==
              parentName
            if ((isChild(selectedNodeKey, parentName), isSame)) {
              showToast({
                severity: 'error',
                summary: 'Fehler beim Ändern der Elterngruppe.',
                detail:
                  'Die Elterngruppe darf nicht die Gruppe selbst oder eine eigene Untergruppe sein.',
                life: 4000
              })
              return
            } else {
              updateNodeAttribute(selectedNodeKey, 'parentgroup', parentName)
              moveNode(selectedNodeKey, parentName)
            }
          }}
          options={parentGroupOptions}
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
          onChange={(e) =>
            updateNodeAttribute(selectedNodeKey, 'algorithm', e.value)
          }
          options={algorithmOptions}
        />
        <CustomFloatLabel
          id="maxnumpsn"
          value={findNodeByKey(tree, selectedNodeKey)?.data.temporal.maxnumpsn.toLocaleString()}
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
        <CustomFloatLabel
          id="paddingCharacter"
          placeholder={t('groups:inputs.paddingchar.label')}
          value={(
            findNodeByKey(tree, selectedNodeKey)?.data.temporal.paddingchar ??
            ''
          ).slice(0, 1)}
          onChange={(e) => {
            //enforce max 1 character
            //paddingchar is used if the psn length is longer than the generated psn by the algorithm
            //e.g. sha256 has 256 chars if the psnlength is 300 then the paddingchar is used to fill the rest
            const val = (e.target.value ?? '').slice(0, 1)
            updateNodeAttribute(selectedNodeKey, 'paddingchar', val)
          }}
          helpText="Leave empty for no padding character."
        />
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
