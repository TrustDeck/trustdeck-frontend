import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { DOCUMENTATION_URL } from '../../core/configs/publicPages'

const sections = ['what', 'who', 'access'] as const

/** Public help page: explains TrustDeck to visitors without requiring a sign-in. */
const Help: React.FC = () => {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-surface px-6 py-10">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-color-blue/10 dark:bg-blue-300/10">
          <QuestionMarkCircleIcon className="h-9 w-9 text-color-blue dark:text-blue-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">{t('common:helpPage.title')}</h1>

        {sections.map((section) => (
          <div key={section} className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t(`common:helpPage.${section}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t(`common:helpPage.${section}.text`)}
            </p>
          </div>
        ))}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('common:helpPage.documentation.title')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t('common:helpPage.documentation.text')}
          </p>
          <a
            href={DOCUMENTATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-color-blue hover:underline dark:text-blue-300"
          >
            {t('common:helpPage.documentation.link')}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="mt-10 border-t border-slate-200 pt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-color-blue hover:underline dark:text-blue-300"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
            {t('common:helpPage.backToLogin')}
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Help
