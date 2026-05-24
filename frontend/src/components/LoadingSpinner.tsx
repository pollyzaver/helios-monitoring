const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
        <div className="absolute inset-0 w-12 h-12 border-2 border-transparent border-b-yellow-500/30 rounded-full animate-pulse" />
      </div>
      <p className="text-sm text-[#94A3B8] animate-pulse">Загрузка данных...</p>
    </div>
  )
}

export default LoadingSpinner