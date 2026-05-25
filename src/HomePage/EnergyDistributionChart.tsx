import { useMemo, useState } from 'react'
import { ResponsivePie } from '@nivo/pie'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type DatePartsInputProps = {
  value: string
  onChange: (value: string) => void
}

type EnergyDistributionChartProps = {
  energyData: EnergyPoint[]
  chartTheme: any
  DatePartsInput: React.ComponentType<DatePartsInputProps>
}

type Range = '24h' | '7d' | '30d' | 'custom'

const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

export default function EnergyDistributionChart({
  energyData,
  chartTheme,
  DatePartsInput,
}: EnergyDistributionChartProps) {
  const [selectedDistributionRange, setSelectedDistributionRange] =
    useState<Range>('24h')

  const [distributionStartDate, setDistributionStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateInput(date)
  })

  const [distributionEndDate, setDistributionEndDate] = useState(() => {
    return formatDateInput(new Date())
  })

  const [
    showDistributionCustomModal,
    setShowDistributionCustomModal,
  ] = useState(false)

  const pieData = useMemo(() => {
    const now = new Date()

    let filtered: EnergyPoint[] = []
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = now

    if (selectedDistributionRange === 'custom') {
      const [startYear, startMonth, startDay] =
        distributionStartDate.split('-').map(Number)

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
        distributionEndDate.split('-').map(Number)

      const end = new Date(
        endYear,
        endMonth - 1,
        endDay,
        23,
        59,
        59,
        999
      )

      if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        start > end
      ) {
        return []
      }

      rangeStart = start
      rangeEnd = end

      filtered = energyData.filter(
        item => item.timestamp >= start && item.timestamp <= end
      )
    } else {
      if (selectedDistributionRange === '24h') {
        rangeStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      }

      if (selectedDistributionRange === '7d') {
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      if (selectedDistributionRange === '30d') {
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      filtered = energyData.filter(
        item => rangeStart && item.timestamp >= rangeStart
      )
    }

    const totalConsumption =
      filtered.length > 1
        ? filtered[filtered.length - 1].accumulated -
          filtered[0].accumulated
        : 0

    const rangeDurationInDays =
      rangeStart && rangeEnd
        ? Math.max(
            (rangeEnd.getTime() - rangeStart.getTime()) /
              (1000 * 60 * 60 * 24),
            1
          )
        : 1

    const averageDailyConsumption =
      totalConsumption / rangeDurationInDays

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
      value: Number(
        (averageDailyConsumption * item.percentage).toFixed(1)
      ),
    }))

    const sorted = [...rawData].sort((a, b) => b.value - a.value)

    return sorted.map((item, index) => ({
      ...item,
      color: [
        '#1d4ed8',
        '#2563eb',
        '#3b82f6',
        '#60a5fa',
        '#93c5fd',
      ][index],
    }))
  }, [
    selectedDistributionRange,
    distributionStartDate,
    distributionEndDate,
    energyData,
  ])

  return (
    <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 h-[520px] shadow-2xl">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold">
              Distribuição
            </h3>

            <p className="text-slate-400 mt-1">
              Média diária por divisão
            </p>
          </div>

          <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
            {(['24h', '7d', '30d', 'custom'] as const).map(range => (
              <button
                key={range}
                onClick={() => {
                  setSelectedDistributionRange(range)

                  if (range === 'custom') {
                    setShowDistributionCustomModal(true)
                  }
                }}
                className={`cursor-pointer px-4 py-2 rounded-xl text-sm transition-all ${
                  selectedDistributionRange === range
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-blue-500/10'
                }`}
              >
                {range === 'custom' ? 'Custom' : range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showDistributionCustomModal && (
        <>
          <div
            onClick={() => setShowDistributionCustomModal(false)}
            className="fixed inset-0 z-[90]"
          />

          <div className="absolute top-24 right-6 z-[100] w-[340px] rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h4 className="font-semibold text-lg">
                Intervalo personalizado
              </h4>

              <button
                onClick={() => setShowDistributionCustomModal(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400">
                  Data inicial
                </label>

                <DatePartsInput
                  value={distributionStartDate}
                  onChange={setDistributionStartDate}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-400">
                  Data final
                </label>

                <DatePartsInput
                  value={distributionEndDate}
                  onChange={setDistributionEndDate}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="h-[360px] mt-4">
        <ResponsivePie
          data={pieData}
          theme={chartTheme}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
          innerRadius={0.5}
          padAngle={2}
          cornerRadius={6}
          activeOuterRadiusOffset={10}
          colors={{ datum: 'data.color' }}
          borderWidth={0}
          enableArcLinkLabels={false}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor="#ffffff"
          arcLabel={d => `${d.value} kWh`}
          animate
          motionConfig="wobbly"
        />
      </div>
    </div>
  )
}