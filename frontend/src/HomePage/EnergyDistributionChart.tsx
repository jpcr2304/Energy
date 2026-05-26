import { useMemo } from 'react'
import { ResponsivePie } from '@nivo/pie'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type Range = '24h' | '7d' | '30d' | 'custom'

type EnergyDistributionChartProps = {
  energyData: EnergyPoint[]
  chartTheme: any
  selectedRange: Range
  customStartDate: string
  customEndDate: string
  isDarkMode: boolean
}

export default function EnergyDistributionChart({
  energyData,
  chartTheme,
  selectedRange,
  customStartDate,
  customEndDate,
  isDarkMode,
}: EnergyDistributionChartProps) {
  const pieData = useMemo(() => {
    const now = new Date()

    let filtered: EnergyPoint[] = []
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = now

    if (selectedRange === 'custom') {
      const [startYear, startMonth, startDay] =
        customStartDate.split('-').map(Number)

      const start = new Date(
        startYear,
        startMonth - 1,
        startDay,
        0,
        0,
        0,
        0
      )

      const [endYear, endMonth, endDay] =
        customEndDate.split('-').map(Number)

      const end = new Date(
        endYear,
        endMonth - 1,
        endDay,
        23,
        59,
        59,
        999
      )

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return []
      }

      rangeStart = start
      rangeEnd = end

      filtered = energyData.filter(
        item => item.timestamp >= start && item.timestamp <= end
      )
    } else {
      if (selectedRange === '24h') {
        rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      if (selectedRange === '7d') {
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      if (selectedRange === '30d') {
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      filtered = energyData.filter(
        item => rangeStart && item.timestamp >= rangeStart
      )
    }

    if (filtered.length <= 1) {
      return []
    }

    const totalConsumption =
      filtered[filtered.length - 1].accumulated - filtered[0].accumulated

    const rangeDurationInDays =
      rangeStart && rangeEnd
        ? Math.max(
            (rangeEnd.getTime() - rangeStart.getTime()) /
              (1000 * 60 * 60 * 24),
            1
          )
        : 1

    const averageDailyConsumption = totalConsumption / rangeDurationInDays

    const divisions = [
      {
        id: 'Cozinha',
        label: 'Cozinha',
        percentage: 0.32,
      },
      {
        id: 'Sala',
        label: 'Sala',
        percentage: 0.24,
      },
      {
        id: 'Quartos',
        label: 'Quartos',
        percentage: 0.19,
      },
      {
        id: 'Escritório',
        label: 'Escritório',
        percentage: 0.14,
      },
      {
        id: 'Outros',
        label: 'Outros',
        percentage: 0.11,
      },
    ]

    const rawData = divisions.map(item => ({
      id: item.id,
      label: item.label,
      percentage: item.percentage,
      value: Number((averageDailyConsumption * item.percentage).toFixed(1)),
    }))

    const sorted = [...rawData].sort((a, b) => b.value - a.value)

    return sorted.map((item, index) => ({
      ...item,
      color: ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'][index],
    }))
  }, [selectedRange, customStartDate, customEndDate, energyData])

  const totalAverageDailyConsumption = pieData.reduce(
    (sum, item) => sum + item.value,
    0
  )

  if (pieData.length === 0) {
    return (
      <section className="relative z-10">
        <div className="mb-4">
          <h3
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}
          >
            Distribuição
          </h3>

          <p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
            Consumo médio diário por divisão
          </p>
        </div>

        <div
          className={`rounded-2xl border border-dashed px-6 py-16 text-center ${
            isDarkMode
              ? 'border-white/10 text-slate-400'
              : 'border-slate-300 text-slate-500'
          }`}
        >
          Sem dados disponíveis para o intervalo selecionado.
        </div>
      </section>
    )
  }

  return (
    <section className="relative z-10">
      <div className="mb-4">
        <h3
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-slate-950'
          }`}
        >
          Distribuição
        </h3>

        <p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
          Consumo médio diário por divisão
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-center mt-8">
        <div className="relative h-[280px]">
          <ResponsivePie
            data={pieData}
            theme={chartTheme}
            margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 10,
            }}
            innerRadius={0.72}
            padAngle={3}
            cornerRadius={8}
            activeOuterRadiusOffset={8}
            colors={{ datum: 'data.color' }}
            borderWidth={0}
            enableArcLinkLabels={false}
            enableArcLabels={false}
            animate
            motionConfig="wobbly"
          />

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-slate-950'
                }`}
              >
                {totalAverageDailyConsumption.toFixed(1)}
              </div>

              <div
                className={
                  isDarkMode
                    ? 'text-xs text-slate-400 mt-1'
                    : 'text-xs text-slate-500 mt-1'
                }
              >
                kWh/dia
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {pieData.map(item => (
            <div
              key={item.id}
              className={`rounded-2xl border px-4 py-3 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.03]'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />

                  <span
                    className={`font-medium text-sm ${
                      isDarkMode ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-semibold ${
                      isDarkMode ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    {item.value} kWh/dia
                  </div>

                  <div
                    className={`text-xs ${
                      isDarkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {Math.round(item.percentage * 100)}%
                  </div>
                </div>
              </div>

              <div
                className={`mt-3 h-2 rounded-full overflow-hidden ${
                  isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                }`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.percentage * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}