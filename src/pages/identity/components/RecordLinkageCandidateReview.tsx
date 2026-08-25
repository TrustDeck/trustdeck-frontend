import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import type { Attribute } from '../../../core/stores/ProjectStore'
import type { RecordLinkageCandidate } from '../../../core/services/TrustDeck'
import DynamicEntity from '../../search/components/DynamicEntity'
import { resolveAttributeLabel } from '../../search/utils/entityDisplay'

export type RecordLinkageCandidateReviewProps = {
  candidates: RecordLinkageCandidate[]
  originalData: Record<string, any>
  schemaAttributes: Attribute[]
  canUpdateCandidates: boolean
  resolving?: boolean
  onUseCandidate: (candidate: RecordLinkageCandidate) => void | Promise<void>
  onCreateOriginal: () => void | Promise<void>
  onMergeCandidate: (
    candidate: RecordLinkageCandidate,
    mergedData: Record<string, any>
  ) => void | Promise<void>
  onBackToOriginal: () => void
}

type LeafDescriptor = {
  attribute: Attribute
  path: string[]
  key: string
}

type MergeChoice = 'candidate' | 'original' | 'both'

function entityId(candidate: RecordLinkageCandidate | undefined): string {
  const entity = candidate?.entity
  return String(
    entity?.trustdeckID ??
      entity?.trustdeckId ??
      entity?.trustDeckId ??
      entity?.id ??
      ''
  )
}

function collectLeafDescriptors(
  attributes: Attribute[] = [],
  prefix: string[] = []
): LeafDescriptor[] {
  return attributes.flatMap((attribute, index) => {
    if (Array.isArray(attribute.attributes)) {
      const nextPrefix =
        attribute.layout === 'group' && attribute.name
          ? [...prefix, attribute.name]
          : prefix
      return collectLeafDescriptors(attribute.attributes, nextPrefix)
    }

    if (!attribute.name) return []
    const path = [...prefix, attribute.name]
    return [
      {
        attribute,
        path,
        key: path.join('.') || `attribute-${index}`
      }
    ]
  })
}

function valuesAtPath(source: unknown, path: string[]): unknown {
  if (path.length === 0) return source
  if (Array.isArray(source)) {
    const collected = source
      .map((entry) => valuesAtPath(entry, path))
      .filter((entry) => entry !== undefined)
    return collected.length === 1 ? collected[0] : collected
  }
  if (!source || typeof source !== 'object') return undefined
  const [head, ...tail] = path
  return valuesAtPath((source as Record<string, any>)[head], tail)
}

function setValueAtPath(
  source: Record<string, any>,
  path: string[],
  value: unknown
): Record<string, any> {
  const next = structuredClone(source ?? {})
  if (path.length === 0) return next

  let cursor: any = next
  for (let index = 0; index < path.length - 1; index++) {
    const segment = path[index]
    const current = cursor[segment]
    if (Array.isArray(current)) {
      // Repeated object groups cannot be mapped unambiguously to one leaf.
      // Preserve their structure and let the user edit them in the full editor.
      return next
    }
    if (!current || typeof current !== 'object') cursor[segment] = {}
    cursor = cursor[segment]
  }
  cursor[path[path.length - 1]] = structuredClone(value)
  return next
}

function normalizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function mergeRepeatableValues(candidate: unknown, original: unknown): unknown[] {
  const combined = [...normalizeArray(candidate), ...normalizeArray(original)]
  const seen = new Set<string>()
  return combined.filter((entry) => {
    const key = JSON.stringify(entry)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (Array.isArray(value)) {
    return value.length ? value.map(displayValue).join(', ') : '—'
  }
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? '✓' : '✕'
  return String(value)
}

function candidateStatus(candidate: RecordLinkageCandidate): string {
  return String(candidate.candidateStatus ?? 'ACTIVE').toUpperCase()
}

export default function RecordLinkageCandidateReview({
  candidates,
  originalData,
  schemaAttributes,
  canUpdateCandidates,
  resolving = false,
  onUseCandidate,
  onCreateOriginal,
  onMergeCandidate,
  onBackToOriginal
}: RecordLinkageCandidateReviewProps) {
  const { t, i18n } = useTranslation('identity')
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [mergeMode, setMergeMode] = useState(false)
  const [mergedData, setMergedData] = useState<Record<string, any>>({})
  const [mergeChoices, setMergeChoices] = useState<Record<string, MergeChoice>>(
    {}
  )

  const descriptors = useMemo(
    () => collectLeafDescriptors(schemaAttributes),
    [schemaAttributes]
  )
  const candidate = candidates[candidateIndex]
  const candidateData = useMemo(
    () =>
      (candidate?.entity?.data ?? {}) as Record<string, any>,
    [candidate]
  )
  const deletedCandidate = candidate
    ? candidateStatus(candidate) === 'DELETED'
    : false
  useEffect(() => {
    if (candidateIndex >= candidates.length) setCandidateIndex(0)
  }, [candidateIndex, candidates.length])

  useEffect(() => {
    setMergeMode(false)
    setMergedData(structuredClone(candidateData))
    setMergeChoices({})
  }, [candidateData, candidateIndex])

  if (!candidate || candidates.length === 0) return null

  const selectMergeChoice = (
    descriptor: LeafDescriptor,
    choice: MergeChoice
  ) => {
    const candidateValue = valuesAtPath(candidateData, descriptor.path)
    const originalValue = valuesAtPath(originalData, descriptor.path)
    const nextValue =
      choice === 'original'
        ? originalValue
        : choice === 'both'
          ? mergeRepeatableValues(candidateValue, originalValue)
          : candidateValue

    setMergeChoices((current) => ({
      ...current,
      [descriptor.key]: choice
    }))
    setMergedData((current) =>
      setValueAtPath(current, descriptor.path, nextValue)
    )
  }

  if (mergeMode) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="td-panel-title text-left">
            {t('crud.mergeCandidateTitle', {
              current: candidateIndex + 1,
              total: candidates.length
            })}
          </h3>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
            {t('crud.mergeCandidateDescription')}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t('crud.attribute')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t('crud.candidateValue')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t('crud.originalValue')}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t('crud.mergeDecision')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {descriptors.map((descriptor) => {
                const candidateValue = valuesAtPath(
                  candidateData,
                  descriptor.path
                )
                const originalValue = valuesAtPath(
                  originalData,
                  descriptor.path
                )
                const selected =
                  mergeChoices[descriptor.key] ?? 'candidate'
                return (
                  <tr key={descriptor.key}>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      {resolveAttributeLabel(
                        descriptor.attribute,
                        i18n.language
                      )}
                    </td>
                    <td className="max-w-[260px] break-words px-4 py-3 text-gray-700 dark:text-gray-200">
                      {displayValue(candidateValue)}
                    </td>
                    <td className="max-w-[260px] break-words px-4 py-3 text-gray-700 dark:text-gray-200">
                      {displayValue(originalValue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            selectMergeChoice(descriptor, 'candidate')
                          }
                          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                            selected === 'candidate'
                              ? 'border-color-blue bg-blue-50 text-color-blue dark:bg-blue-950/40'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t('crud.keepCandidateValue')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            selectMergeChoice(descriptor, 'original')
                          }
                          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                            selected === 'original'
                              ? 'border-color-blue bg-blue-50 text-color-blue dark:bg-blue-950/40'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t('crud.useOriginalValue')}
                        </button>
                        {descriptor.attribute.repeatable && (
                          <button
                            type="button"
                            onClick={() =>
                              selectMergeChoice(descriptor, 'both')
                            }
                            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                              selected === 'both'
                                ? 'border-color-blue bg-blue-50 text-color-blue dark:bg-blue-950/40'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {t('crud.keepBothValues')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="td-section-title mb-3">
            {t('crud.editMergedCandidate')}
          </h3>
          <DynamicEntity
            entity={{
              ...candidate.entity,
              data: mergedData
            }}
            schemaAttributes={schemaAttributes}
            editMode
            formData={mergedData}
            onFieldChange={(path, value) =>
              setMergedData((current) => {
                const next = structuredClone(current)
                let cursor: any = next
                for (let index = 0; index < path.length - 1; index++) {
                  const segment = path[index]
                  const following = path[index + 1]
                  if (cursor[segment] === undefined || cursor[segment] === null)
                    cursor[segment] =
                      typeof following === 'number' ? [] : {}
                  cursor = cursor[segment]
                }
                cursor[path[path.length - 1]] = value
                return next
              })
            }
            showIdentifierPanel={false}
            plainAttributes
          />
        </div>

        <div className="flex flex-wrap justify-center gap-3 border-t border-gray-200 pt-5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onMergeCandidate(candidate, mergedData)}
            disabled={resolving || !canUpdateCandidates || deletedCandidate}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-color-blue px-5 py-2.5 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckIcon className="mr-2 h-5 w-5" />
            {t('crud.saveMergedCandidate')}
          </button>
          <button
            type="button"
            onClick={() => setMergeMode(false)}
            disabled={resolving}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-color-blue px-5 py-2.5 font-semibold text-color-blue transition hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <XMarkIcon className="mr-2 h-5 w-5" />
            {t('crud.backToComparison')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-800 dark:bg-amber-950/30">
        <h3 className="td-panel-title text-left">
          {t('crud.linkageConflictTitle')}
        </h3>
        <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
          {t('crud.candidateReviewDescription', { count: candidates.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            title={t('crud.previousCandidate')}
            aria-label={t('crud.previousCandidate')}
            onClick={() => setCandidateIndex((current) => current - 1)}
            disabled={candidateIndex === 0 || resolving}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <span>{t('crud.candidate')}</span>
            <select
              value={candidateIndex}
              onChange={(event) => setCandidateIndex(Number(event.target.value))}
              disabled={resolving}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            >
              {candidates.map((entry, index) => (
                <option key={`${entityId(entry)}-${index}`} value={index}>
                  {index + 1} / {candidates.length} · {entityId(entry) || '—'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            title={t('crud.nextCandidate')}
            aria-label={t('crud.nextCandidate')}
            onClick={() => setCandidateIndex((current) => current + 1)}
            disabled={candidateIndex >= candidates.length - 1 || resolving}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            {t('crud.linkageScore')}:&nbsp;
            {(Number(candidate.normalizedScore ?? 0) * 100).toLocaleString(
              i18n.language,
              { maximumFractionDigits: 2 }
            )}
            %
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="w-1/4 px-4 py-3 font-semibold">
                {t('crud.attribute')}
              </th>
              <th className="w-[37.5%] px-4 py-3 font-semibold">
                {t('crud.originalEntity')}
              </th>
              <th className="w-[37.5%] px-4 py-3 font-semibold">
                {t('crud.candidateEntity')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {descriptors.map((descriptor) => {
              const originalValue = valuesAtPath(originalData, descriptor.path)
              const candidateValue = valuesAtPath(candidateData, descriptor.path)
              const equal = valuesEqual(originalValue, candidateValue)
              return (
                <tr
                  key={descriptor.key}
                  className={
                    equal
                      ? ''
                      : 'bg-amber-50/60 dark:bg-amber-950/10'
                  }
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {resolveAttributeLabel(
                      descriptor.attribute,
                      i18n.language
                    )}
                  </td>
                  <td className="max-w-[360px] break-words px-4 py-3 text-gray-700 dark:text-gray-200">
                    {displayValue(originalValue)}
                  </td>
                  <td className="max-w-[360px] break-words px-4 py-3 text-gray-700 dark:text-gray-200">
                    {displayValue(candidateValue)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {deletedCandidate && (
        <p className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200">
          {t('crud.deletedCandidateNotice')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-5 md:grid-cols-3 dark:border-slate-700">
        <button
          type="button"
          onClick={() => onUseCandidate(candidate)}
          disabled={resolving || deletedCandidate}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-color-blue px-4 py-3 font-semibold text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
        >
          <CheckIcon className="mr-2 h-5 w-5" />
          {t('crud.useCandidate')}
        </button>
        <button
          type="button"
          onClick={onCreateOriginal}
          disabled={resolving}
          className="inline-flex min-h-12 items-center justify-center rounded-lg bg-color-blue px-4 py-3 font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckIcon className="mr-2 h-5 w-5" />
          {t('crud.createOriginalAnyway')}
        </button>
        <button
          type="button"
          onClick={() => setMergeMode(true)}
          disabled={resolving || !canUpdateCandidates || deletedCandidate}
          className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-color-blue px-4 py-3 font-semibold text-color-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
        >
          <PencilSquareIcon className="mr-2 h-5 w-5" />
          {t('crud.mergeWithCandidate')}
        </button>
      </div>

      {!canUpdateCandidates && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          {t('crud.mergeNeedsUpdatePermission')}
        </p>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onBackToOriginal}
          disabled={resolving}
          className="text-sm font-semibold text-color-blue underline-offset-2 hover:underline disabled:opacity-50"
        >
          {t('crud.backToEnteredEntity')}
        </button>
      </div>
    </div>
  )
}
