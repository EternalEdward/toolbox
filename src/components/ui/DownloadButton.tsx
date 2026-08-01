import { saveAs } from 'file-saver'

interface Props {
  blob: Blob
  filename: string
  disabled?: boolean
  label?: string
}

export default function DownloadButton({
  blob,
  filename,
  disabled = false,
  label = '下载',
}: Props) {
  const handleDownload = () => {
    saveAs(blob, filename)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={disabled}
      className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
      }`}
    >
      {label}
    </button>
  )
}
