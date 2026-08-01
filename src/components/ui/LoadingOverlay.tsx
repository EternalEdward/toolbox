interface Props {
  message: string
  progress?: number
}

export default function LoadingOverlay({ message, progress }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-4" />
      <p className="text-gray-600 text-sm mb-2">{message}</p>
      {progress !== undefined && (
        <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
