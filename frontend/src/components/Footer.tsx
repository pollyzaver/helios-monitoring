const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-helios-card border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="text-gray-500">
            © {currentYear} Helios Solar Monitoring System
          </div>
          <div className="flex gap-6">
            <span className="text-gray-600">Версия 2.0.0</span>
            <span className="text-gray-600">
              Источник данных: Open-Meteo API (Греция)
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer