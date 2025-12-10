import { useRef } from 'react'
import Panel from '../../../core/components/common/Panel'
import Divider from '../../../core/components/common/Divider'
import { useTranslation } from 'react-i18next'
import PrimaryButton from '../../../core/components/form/buttons/PrimaryButton'
import { PlusIcon } from "@heroicons/react/24/outline";

/**
 * `BulkRegistration` is a React component that provides a drag-and-drop area 
 * for uploading multiple files, typically used for registering entities in bulk via CSV or Excel files.
 * 
 * Users can drag and drop files onto the panel or click to trigger the file input dialog.
 * The selected files are then uploaded using a `POST` request with `FormData`.
 *
 * @component
 * @returns {JSX.Element} The rendered bulk file upload UI.
 */

export default function BulkRegistration() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    // TODO: figure out how this will work
    if (files?.length) {
      console.log('Selected files:', files)
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('files[]', file))
      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      }).then(() => console.log('Upload complete'))
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length) {
      console.log('Dropped files:', files)
      const formData = new FormData()
      Array.from(files).forEach(file => formData.append('files[]', file))
      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      }).then(() => console.log('Upload complete'))
    }
  }

  return (
    <Panel>
      <h2>{t('identity:headers.data')}</h2>
      <Divider />

      <div
        className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-gray-300 p-10 rounded-lg text-center bg-gray-50 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <h4>{t('identity:bulk.dragAndDrop')}</h4>
        <h4>or</h4>
        <PrimaryButton
          label={t('identity:bulk.selectFile')}
          icon={<PlusIcon className="w-6 h-6 mr-1" />}
          className="p-button-outlined"
        />
        <input
          type="file"
          accept=".csv, .xls, .xlsx"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </Panel>
  )
}
