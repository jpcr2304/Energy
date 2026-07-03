import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveAreaBump } from '@nivo/bump'
import { AnimatePresence, motion } from 'framer-motion'
import TemporalEnergyChart from './TemporalEnergyChart'
import EnergyDistributionChart from './EnergyDistributionChart'
import EnergyStatsCards from './EnergyStatsCards'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type Range = '24h' | '7d' | '30d' | 'custom'
type ActiveView = 'temporal' | 'distribution' | 'daily' | 'insights'
type ThemeMode = 'dark' | 'light'
type TopPage = 'statistics' | 'devices' | 'settings'

function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="M21.5 12h-2.2" />
      <path d="M4.7 12H2.5" />
      <path d="M18.7 5.3l-1.6 1.6" />
      <path d="M6.9 17.1l-1.6 1.6" />
      <path d="M18.7 18.7l-1.6-1.6" />
      <path d="M6.9 6.9L5.3 5.3" />
    </svg>
  )
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A8.8 8.8 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
    </svg>
  )
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function EnergyDashboardHomepage() {

  const navigate = useNavigate()

  function handleSignOut() {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    navigate('/')
  }

  const generateEnergyData = (): EnergyPoint[] => {
    const data: EnergyPoint[] = []

    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 30)

    const current = new Date(start)
    let accumulated = 0

    while (current <= now) {
      const intervalConsumption = Math.floor(Math.random() * 8) + 2
      accumulated += intervalConsumption

      data.push({
        timestamp: new Date(current),
        accumulated,
      })

      current.setHours(current.getHours() + 1)
    }

    return data
  }

  const generatedEnergyData = useMemo(() => generateEnergyData(), [])

  const [backendEnergyData, setBackendEnergyData] = useState<EnergyPoint[]>([])
  const [isEnergyDataLoading, setIsEnergyDataLoading] = useState(true)

  useEffect(() => {
    const fetchEnergyData = () => {
      fetch('/api/energy/points')
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch energy data')
          }

          return response.json()
        })
        .then(data => {
          const parsedData: EnergyPoint[] = data.map(
            (item: { timestamp: string; accumulated: number }) => ({
              timestamp: new Date(item.timestamp),
              accumulated: item.accumulated,
            })
          )

          setBackendEnergyData(parsedData)
        })
        .catch(() => {
          setBackendEnergyData([])
        })
        .finally(() => {
          setIsEnergyDataLoading(false)
        })
    }

    fetchEnergyData()

    const interval = window.setInterval(fetchEnergyData, 10000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const [themeMode, setThemeMode] = useState<ThemeMode>('dark')
  const [selectedRange, setSelectedRange] = useState<Range>('24h')
  const [activeTopPage, setActiveTopPage] = useState<TopPage>('statistics')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)

  const userMenuRef = useRef<HTMLDivElement | null>(null)

  const graphViews: ActiveView[] = [
    'temporal',
    'distribution',
    'daily',
    'insights',
  ]

  const [graphState, setGraphState] = useState<{
    view: ActiveView
    direction: number
  }>({
    view: 'temporal',
    direction: 1,
  })

  const [isGraphAnimating, setIsGraphAnimating] = useState(false)

  const activeView = graphState.view
  const slideDirection = graphState.direction

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const isDarkMode = themeMode === 'dark'

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateInput(date)
  })

  const [customEndDate, setCustomEndDate] = useState(() => {
    return formatDateInput(new Date())
  })

  const getRangeWindow = (range: Range) => {
    const now = new Date()
    let start = new Date(now)

    if (range === '24h') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    if (range === '7d') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    if (range === '30d') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    if (range === 'custom') {
      const [startYear, startMonth, startDay] =
        customStartDate.split('-').map(Number)

      const [endYear, endMonth, endDay] =
        customEndDate.split('-').map(Number)

      const customStart = new Date(
        startYear,
        startMonth - 1,
        startDay,
        0,
        0,
        0,
        0
      )

      const customEnd = new Date(
        endYear,
        endMonth - 1,
        endDay,
        23,
        59,
        59,
        999
      )

      return {
        start: customStart,
        end: customEnd,
      }
    }

    return {
      start,
      end: now,
    }
  }

  const hasEnoughRealDataForSelectedRange = useMemo(() => {
    if (isEnergyDataLoading) {
      return false
    }

    const { start, end } = getRangeWindow(selectedRange)

    const rangeData = backendEnergyData.filter(
      item => item.timestamp >= start && item.timestamp <= end
    )

    return rangeData.length >= 25
  }, [
    backendEnergyData,
    selectedRange,
    customStartDate,
    customEndDate,
    isEnergyDataLoading,
  ])

  const energyData = hasEnoughRealDataForSelectedRange
    ? backendEnergyData
    : generatedEnergyData

  const isShowingFictitiousData = !hasEnoughRealDataForSelectedRange
  const shouldShowEnergyLoading = isEnergyDataLoading

  const DatePartsInput = ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => {
    const [year, month, day] = value.split('-')

    const [localDay, setLocalDay] = useState(day)
    const [localMonth, setLocalMonth] = useState(month)
    const [localYear, setLocalYear] = useState(year)

    const daysInMonth = (month: number, year: number) => {
      return new Date(year, month, 0).getDate()
    }

    const validateAndCommit = (
      nextDay: string,
      nextMonth: string,
      nextYear: string
    ) => {
      let d = Number(nextDay)
      let m = Number(nextMonth)
      let y = Number(nextYear)

      if (isNaN(d)) d = 1
      if (isNaN(m)) m = 1
      if (isNaN(y)) y = 2024

      m = Math.min(Math.max(m, 1), 12)
      d = Math.min(Math.max(d, 1), daysInMonth(m, y))
      y = Math.min(Math.max(y, 2000), 2100)

      onChange(
        `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      )
    }

    return (
      <div
        className={`flex items-center gap-1 rounded-xl px-3 py-2 text-sm border ${
          isDarkMode
            ? 'bg-slate-950 border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-950'
        }`}
      >
        <input
          value={localDay}
          maxLength={2}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const nextValue = e.target.value.replace(/\D/g, '')
            setLocalDay(nextValue)
          }}
          onBlur={() => validateAndCommit(localDay, localMonth, localYear)}
          className="w-7 bg-transparent text-center outline-none"
        />

        <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
          /
        </span>

        <input
          value={localMonth}
          maxLength={2}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const nextValue = e.target.value.replace(/\D/g, '')
            setLocalMonth(nextValue)
          }}
          onBlur={() => validateAndCommit(localDay, localMonth, localYear)}
          className="w-7 bg-transparent text-center outline-none"
        />

        <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
          /
        </span>

        <input
          value={localYear}
          maxLength={4}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const nextValue = e.target.value.replace(/\D/g, '')
            setLocalYear(nextValue)
          }}
          onBlur={() => validateAndCommit(localDay, localMonth, localYear)}
          className="w-12 bg-transparent text-center outline-none"
        />
      </div>
    )
  }

  const chartTheme = {
    text: {
      fill: isDarkMode ? '#94a3b8' : '#64748b',
      fontSize: 12,
    },
    axis: {
      ticks: {
        text: {
          fill: isDarkMode ? '#94a3b8' : '#64748b',
        },
      },
      legend: {
        text: {
          fill: isDarkMode ? '#cbd5e1' : '#334155',
        },
      },
      domain: {
        line: {
          stroke: isDarkMode ? '#334155' : '#cbd5e1',
        },
      },
    },
    grid: {
      line: {
        stroke: isDarkMode ? '#1e293b' : '#e2e8f0',
      },
    },
    tooltip: {
      container: {
        background: isDarkMode ? '#020617' : '#ffffff',
        color: isDarkMode ? '#ffffff' : '#0f172a',
        borderRadius: '12px',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
      },
    },
  }

  const pageClasses = isDarkMode
    ? 'bg-[#020617] text-white'
    : 'bg-slate-100 text-slate-950'

  const mutedTextClasses = isDarkMode ? 'text-slate-400' : 'text-slate-500'

  const subtleBorderClasses = isDarkMode ? 'border-white/10' : 'border-slate-200'

  const statsCardClasses = isDarkMode
    ? 'rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl hover:bg-white/[0.07]'
    : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md'

  const tabContainerClasses = isDarkMode
    ? 'flex flex-wrap gap-2 rounded-2xl bg-white/5 border border-white/10 p-1 w-fit'
    : 'flex flex-wrap gap-2 rounded-2xl bg-white border border-slate-200 p-1 w-fit'

  const rangeContainerClasses = isDarkMode
    ? 'flex gap-2 rounded-2xl bg-white/5 border border-white/10 p-1 w-fit'
    : 'flex gap-2 rounded-2xl bg-white border border-slate-200 p-1 w-fit'

  const changeActiveView = (nextView: ActiveView) => {
    if (nextView === activeView || isGraphAnimating) {
      return
    }

    const currentIndex = graphViews.indexOf(activeView)
    const nextIndex = graphViews.indexOf(nextView)

    setGraphState({
      view: nextView,
      direction: nextIndex > currentIndex ? 1 : -1,
    })
  }

  const renderMainContent = (view: ActiveView) => {
    if (view === 'temporal') {
      return (
        <TemporalEnergyChart
          energyData={energyData}
          chartTheme={chartTheme}
          selectedRange={selectedRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          isDarkMode={isDarkMode}
        />
      )
    }

    if (view === 'distribution') {
      return (
        <EnergyDistributionChart
          energyData={energyData}
          chartTheme={chartTheme}
          selectedRange={selectedRange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          isDarkMode={isDarkMode}
        />
      )
    }

    if (view === 'daily') {
      return (
        <section>
          <div className="mb-6">
            <h3
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-950'
              }`}
            >
              Consumo Diário
            </h3>

            <p className={`${mutedTextClasses} mt-1`}>
              Horas de maior utilização
            </p>
          </div>

          <div className="h-[420px]">
            <ResponsiveAreaBump
              data={[
                {
                  id: 'Hoje',
                  data: Array.from({ length: 12 }).map((_, index) => ({
                    x: `${index * 2}:00`,
                    y: Math.floor(Math.random() * 10),
                  })),
                },
              ]}
              theme={chartTheme}
              margin={{
                top: 40,
                right: 40,
                bottom: 40,
                left: 40,
              }}
              spacing={8}
              colors={['#1d4ed8']}
              fillOpacity={0.22}
              blendMode="normal"
              animate
              motionConfig="gentle"
            />
          </div>
        </section>
      )
    }

    return (
      <section>
        <div className="mb-6">
          <h3
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}
          >
            Insights Inteligentes
          </h3>

          <p className={`${mutedTextClasses} mt-1`}>
            Sugestões automáticas baseadas no consumo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className={`rounded-2xl border p-5 ${
              isDarkMode
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <h4
              className={`font-semibold ${
                isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
              }`}
            >
              Melhor horário
            </h4>

            <p
              className={`mt-2 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              O menor consumo energético acontece entre as 02:00 e as 06:00.
            </p>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isDarkMode
                ? 'border-yellow-500/20 bg-yellow-500/10'
                : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <h4
              className={`font-semibold ${
                isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
              }`}
            >
              Pico detetado
            </h4>

            <p
              className={`mt-2 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              O maior pico de consumo acontece perto das 20:00.
            </p>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isDarkMode
                ? 'border-blue-500/20 bg-blue-500/10'
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <h4
              className={`font-semibold ${
                isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}
            >
              Recomendação
            </h4>

            <p
              className={`mt-2 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              Transferir cargas pesadas para horários noturnos pode reduzir
              custos mensais.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const renderDevicesPage = () => {
    return (
      <section className="pt-8">
        <div className="mb-6">
          <h2 className="text-4xl font-bold">
            Devices
          </h2>

          <p className={mutedTextClasses}>
            Gestão dos equipamentos ligados à aplicação.
          </p>
        </div>

        <div
          className={`rounded-2xl border border-dashed p-10 text-center ${
            isDarkMode
              ? 'border-white/10 text-slate-400'
              : 'border-slate-300 text-slate-500'
          }`}
        >
          Ainda não existem dispositivos configurados.
        </div>
      </section>
    )
  }

  const renderSettingsPage = () => {
    return (
      <section className="pt-8">
        <div className="mb-6">
          <h2 className="text-4xl font-bold">
            Settings
          </h2>

          <p className={mutedTextClasses}>
            Preferências e configurações da aplicação.
          </p>
        </div>

        <div
          className={`rounded-2xl border border-dashed p-10 text-center ${
            isDarkMode
              ? 'border-white/10 text-slate-400'
              : 'border-slate-300 text-slate-500'
          }`}
        >
          Ainda não existem definições disponíveis.
        </div>
      </section>
    )
  }

  const graphVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 80 : -80,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -80 : 80,
      opacity: 0,
    }),
  }

  return (
    <div className={`min-h-screen overflow-x-hidden ${pageClasses}`}>
      <div
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          isDarkMode
            ? 'border-white/10 bg-[#020617]/90'
            : 'border-slate-200 bg-slate-100/90'
        }`}
      >
        <div className="mx-auto w-[94%] xl:w-[90%] px-6 xl:px-8 py-5">
          <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-600/25">
              V
            </div>

            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Volt
              </h1>

              <p className={`text-sm ${mutedTextClasses}`}>
                Energy Analytics Dashboard
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            {[
              { id: 'statistics', label: 'Statistics' },
              { id: 'devices', label: 'Devices' },
              { id: 'settings', label: 'Settings' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTopPage(item.id as TopPage)}
                className={`cursor-pointer text-sm font-semibold transition-colors ${
                  activeTopPage === item.id
                    ? isDarkMode
                      ? 'text-blue-400'
                      : 'text-blue-600'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-6">
            <button
              onClick={() =>
                setThemeMode(current =>
                  current === 'dark' ? 'light' : 'dark'
                )
              }
              className="cursor-pointer flex items-center gap-3"
              aria-label="Alterar tema"
            >
              <span
                className={`transition-colors ${
                  isDarkMode ? 'text-slate-300' : 'text-amber-500'
                }`}
              >
                {isDarkMode ? (
                  <MoonIcon className="h-5 w-5" />
                ) : (
                  <SunIcon className="h-5 w-5" />
                )}
              </span>

              <div
                className={`relative h-7 w-14 rounded-full transition-all duration-300 ${
                  isDarkMode ? 'bg-blue-600/30' : 'bg-amber-400/40'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    isDarkMode ? 'translate-x-[-24px]' : 'translate-x-[4px]'
                  }`}
                />
              </div>

              <span
                className={`hidden sm:inline text-sm font-medium ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {isDarkMode ? 'Dark' : 'Light'}
              </span>
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(value => !value)}
                className="cursor-pointer flex items-center gap-3"
              >
                <img
                  src="https://i.pravatar.cc/80?img=12"
                  alt="Utilizador"
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-500/40"
                />

                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold">
                    João Rodrigues
                  </p>

                  <p className={`text-xs ${mutedTextClasses}`}>
                    Admin
                  </p>
                </div>

                <ChevronDownIcon
                  className={`h-4 w-4 ${mutedTextClasses}`}
                />
              </button>

              {showUserMenu && (
                <div
                  className={`absolute right-0 top-16 z-50 w-52 rounded-2xl border shadow-2xl overflow-hidden ${
                    isDarkMode
                      ? 'border-white/10 bg-slate-950'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    className={`px-4 py-3 border-b ${
                      isDarkMode ? 'border-white/10' : 'border-slate-200'
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      João Rodrigues
                    </p>

                    <p className={`text-xs ${mutedTextClasses}`}>
                      jpcr.2304@gmail.com
                    </p>
                  </div>

                  <button
                    className={`cursor-pointer w-full px-4 py-3 text-left text-sm ${
                      isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                    }`}
                  >
                    Account
                  </button>

                  <button
                    onClick={handleSignOut}
                    className={`cursor-pointer w-full px-4 py-3 text-left text-sm ${
                      isDarkMode
                        ? 'text-rose-300 hover:bg-rose-500/10'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
          </header>
        </div>
      </div>

      <main className="mx-auto w-[92%] xl:w-[80%] py-8">
          {activeTopPage === 'statistics' && (
            <>
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-4xl font-bold">
                  Statistics
                </h2>

                <p className={mutedTextClasses}>
                  Resumo geral do consumo energético da aplicação.
                </p>
              </div>

              <EnergyStatsCards
                backendEnergyData={energyData}
                mutedTextClasses={mutedTextClasses}
                statsCardClasses={statsCardClasses}
              />

              <section
                className={`flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-8 border-t pt-6 ${subtleBorderClasses}`}
              >
                <div className={tabContainerClasses}>
                  {[
                    { id: 'temporal', label: 'Temporal' },
                    { id: 'distribution', label: 'Distribuição' },
                    { id: 'daily', label: 'Consumo Diário' },
                    { id: 'insights', label: 'Insights' },
                  ].map(item => (
                    <button
                      key={item.id}
                      disabled={isGraphAnimating}
                      onClick={() => changeActiveView(item.id as ActiveView)}
                      className={`relative isolate cursor-pointer px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        activeView === item.id
                          ? 'text-white'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {activeView === item.id && (
                        <motion.span
                          layoutId="active-graph-tab"
                          className="absolute inset-0 z-0 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20"
                          transition={{
                            type: 'spring',
                            stiffness: 450,
                            damping: 35,
                          }}
                        />
                      )}

                      <span className="relative z-10">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className={rangeContainerClasses}>
                  {(['24h', '7d', '30d', 'custom'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => {
                        setSelectedRange(range)

                        if (range === 'custom') {
                          setShowCustomModal(true)
                        }
                      }}
                      className={`relative isolate cursor-pointer px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        selectedRange === range
                          ? 'text-white'
                          : isDarkMode
                            ? 'text-slate-400 hover:text-white'
                            : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {selectedRange === range && (
                        <motion.span
                          layoutId="active-range-tab"
                          className="absolute inset-0 z-0 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20"
                          transition={{
                            type: 'spring',
                            stiffness: 450,
                            damping: 35,
                          }}
                        />
                      )}

                      <span className="relative z-10">
                        {range === 'custom' ? 'Custom' : range}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="pt-2">
                {!isEnergyDataLoading && isShowingFictitiousData && (
                  <div
                    className={`mb-5 rounded-2xl border px-5 py-4 ${
                      isDarkMode
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    <p className="font-semibold">
                      Not enough real data for this range yet
                    </p>

                    <p className="mt-1 text-sm opacity-90">
                      The displayed data is generated for demonstration purposes. Real data will be shown after enough data has been collected for the selected period.
                    </p>
                  </div>
                )}

                {shouldShowEnergyLoading ? (
                  <div
                    className={`h-[460px] rounded-2xl border flex items-center justify-center ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5 text-slate-400'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />

                      <p className="text-sm font-medium">
                        Loading energy data...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-visible">
                    <AnimatePresence mode="wait" custom={slideDirection} initial={false}>
                      <motion.div
                        key={activeView}
                        custom={slideDirection}
                        variants={graphVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        onAnimationStart={() => setIsGraphAnimating(true)}
                        onAnimationComplete={() => setIsGraphAnimating(false)}
                        transition={{
                          duration: 0.18,
                          ease: 'easeInOut',
                        }}
                      >
                        {renderMainContent(activeView)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTopPage === 'devices' && renderDevicesPage()}

          {activeTopPage === 'settings' && renderSettingsPage()}

          {showCustomModal && activeTopPage === 'statistics' && (
            <>
              <div
                onClick={() => setShowCustomModal(false)}
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              />

              <div
                className={`fixed left-1/2 top-1/2 z-50 w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border p-5 shadow-2xl ${
                  isDarkMode
                    ? 'border-white/10 bg-slate-950'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-semibold text-lg">
                    Intervalo personalizado
                  </h4>

                  <button
                    onClick={() => setShowCustomModal(false)}
                    className={`cursor-pointer ${mutedTextClasses} hover:opacity-80`}
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label className={`text-sm ${mutedTextClasses}`}>
                      Data inicial
                    </label>

                    <DatePartsInput
                      value={customStartDate}
                      onChange={setCustomStartDate}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className={`text-sm ${mutedTextClasses}`}>
                      Data final
                    </label>

                    <DatePartsInput
                      value={customEndDate}
                      onChange={setCustomEndDate}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
         </main>
      </div>
    )
}