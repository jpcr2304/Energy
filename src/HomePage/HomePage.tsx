import { useMemo, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { ResponsivePie } from '@nivo/pie'
import { ResponsiveAreaBump } from '@nivo/bump'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type EnergyIntervalPoint = {
  start: Date
  end: Date
  consumption: number
}

export default function EnergyDashboardHomepage() {
  const generateEnergyData = (): EnergyPoint[] => {
    const data: EnergyPoint[] = []

    const now = new Date()
    const start = new Date(now)

    start.setDate(now.getDate() - 30)

    const current = new Date(start)

    let accumulated = 0

    while (current <= now) {
      const intervalConsumption =
        Math.floor(Math.random() * 8) + 2

      accumulated += intervalConsumption

      data.push({
        timestamp: new Date(current),
        accumulated,
      })

      current.setHours(current.getHours() + 1)
    }

    return data
  }

  const energyData = useMemo(() => generateEnergyData(), [])

  const [selectedDistributionRange, setSelectedDistributionRange] = useState<
    '24h' | '7d' | '30d' | 'custom'
  >('24h')

  const [selectedRange, setSelectedRange] = useState<
    '24h' | '7d' | '30d' | 'custom'
  >('24h')

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateInput(date)
  })

  const [customEndDate, setCustomEndDate] = useState(() => {
    return formatDateInput(new Date())
  })

  const [distributionStartDate, setDistributionStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateInput(date)
  })

  const [distributionEndDate, setDistributionEndDate] = useState(() => {
    return formatDateInput(new Date())
  })

  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null)

  function normalizeDataPoints(
    data: EnergyIntervalPoint[],
    targetPoints: number
  ) {
    if (data.length <= targetPoints) {
      return data
    }

    const bucketSize = Math.floor(
      data.length / targetPoints
    )

    const normalized: EnergyIntervalPoint[] = []

    for (let i = 0; i < targetPoints; i++) {
      const start = i * bucketSize
      const end = start + bucketSize

      const bucket = data.slice(start, end)

      if (bucket.length === 0) continue

      const avg =
        bucket.reduce(
          (acc, item) => acc + item.consumption,
          0
        ) / bucket.length

      normalized.push({
        start: bucket[0].start,
        end: bucket[bucket.length - 1].end,
        consumption: Number(avg.toFixed(2)),
      })
    }

    return normalized
  }

  function buildIntervals(
    data: EnergyPoint[]
  ): EnergyIntervalPoint[] {
    const intervals: EnergyIntervalPoint[] = []

    for (let i = 1; i < data.length; i++) {
      const previous = data[i - 1]
      const current = data[i]

      intervals.push({
        start: previous.timestamp,
        end: current.timestamp,
        consumption:
          current.accumulated -
          previous.accumulated,
      })
    }

    return intervals
  }

  const filteredData = useMemo(() => {
    const now = new Date()

    let startDate = new Date()

    if (selectedRange === '24h') {
      startDate = new Date(now.getTime() - 25 * 60 * 60 * 1000)
    }

    if (selectedRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    if (selectedRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    let filtered: EnergyPoint[] = []

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

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return []
      }
      filtered = energyData.filter(
        item =>
          item.timestamp >= start &&
          item.timestamp <= end
      )
    } else {
      filtered = energyData.filter(
        item => item.timestamp >= startDate
      )
    }

    const intervals = buildIntervals(filtered)

    return normalizeDataPoints(intervals, 24)
  }, [
    selectedRange,
    energyData,
    customStartDate,
    customEndDate,
  ])

  const currentChartData = useMemo(() => {
    return [
      {
        id: 'Energia',
        data: filteredData.map((item, index) => {
          const startLabel =
            item.start.toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
            }) +
            ' ' +
            item.start.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            })

          const endLabel =
            item.end.toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
            }) +
            ' ' +
            item.end.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            })

          return {
            x: `${index}`,
            label:
              selectedRange === '24h'
                ? item.start.toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : item.start.toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                  }),

            intervalLabel: `${startLabel} → ${endLabel}`,

            y: item.consumption,
          }
        }),
      },
    ]
  }, [filteredData, selectedRange])

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

      d = Math.min(
        Math.max(d, 1),
        daysInMonth(m, y)
      )

      y = Math.min(Math.max(y, 2000), 2100)

      onChange(
        `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      )
    }

    return (
      <div className="flex items-center gap-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-sm">
        <input
          value={localDay}
          maxLength={2}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const value = e.target.value.replace(/\D/g, '')
            setLocalDay(value)
          }}
          onBlur={() => {
            validateAndCommit(localDay, localMonth, localYear)
          }}
          className="w-7 bg-transparent text-center outline-none"
        />

        <span className="text-slate-500">/</span>

        <input
          value={localMonth}
          maxLength={2}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const value = e.target.value.replace(/\D/g, '')
            setLocalMonth(value)
          }}
          onBlur={() => {
            validateAndCommit(localDay, localMonth, localYear)
          }}
          className="w-7 bg-transparent text-center outline-none"
        />

        <span className="text-slate-500">/</span>

        <input
          value={localYear}
          maxLength={4}
          onClick={e => e.currentTarget.select()}
          onFocus={e => e.currentTarget.select()}
          onChange={e => {
            const value = e.target.value.replace(/\D/g, '')
            setLocalYear(value)
          }}
          onBlur={() => {
            validateAndCommit(localDay, localMonth, localYear)
          }}
          className="w-12 bg-transparent text-center outline-none"
        />
      </div>
    )
  }

  const [showCustomModal, setShowCustomModal] =
    useState(false)

  const [
    showDistributionCustomModal,
    setShowDistributionCustomModal,
  ] = useState(false)

  const chartTitle = useMemo(() => {
    if (selectedRange === '24h') return 'Últimas 24 horas'
    if (selectedRange === '7d') return 'Últimos 7 dias'
    if (selectedRange === '30d') return 'Últimos 30 dias'
    return 'Intervalo personalizado'
  }, [selectedRange])

  const pieData = useMemo(() => {
    const now = new Date()

    let filtered: EnergyPoint[] = []

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
        isNaN(end.getTime())
      ) {
        return []
      }

      filtered = energyData.filter(
        item =>
          item.timestamp >= start &&
          item.timestamp <= end
      )
    } else {
      let startDate = new Date()

      if (selectedDistributionRange === '24h') {
        startDate = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        )
      }

      if (selectedDistributionRange === '7d') {
        startDate = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        )
      }

      if (selectedDistributionRange === '30d') {
        startDate = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        )
      }

      filtered = energyData.filter(
        item => item.timestamp >= startDate
      )
    }

    const totalConsumption =
      filtered.length > 1
        ? filtered[filtered.length - 1].accumulated -
          filtered[0].accumulated
        : 0

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
        (totalConsumption * item.percentage).toFixed(1)
      ),
    }))

    const sorted = [...rawData].sort(
      (a, b) => b.value - a.value
    )

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

  const stats = [
    {
      title: 'Consumo Hoje',
      value: '48.2 kWh',
      growth: '+12%',
    },
    {
      title: 'Pico Máximo',
      value: '7.1 kWh',
      growth: '+5%',
    },
    {
      title: 'Custo Estimado',
      value: '€132',
      growth: '-8%',
    },
    {
      title: 'Eficiência',
      value: '92%',
      growth: '+3%',
    },
  ]

  const chartTheme = {
    text: {
      fill: '#94a3b8',
      fontSize: 12,
    },
    axis: {
      ticks: {
        text: {
          fill: '#94a3b8',
        },
      },
      legend: {
        text: {
          fill: '#cbd5e1',
        },
      },
      domain: {
        line: {
          stroke: '#334155',
        },
      },
    },
    grid: {
      line: {
        stroke: '#1e293b',
      },
    },
    tooltip: {
      container: {
        background: '#0f172a',
        color: '#fff',
        borderRadius: '12px',
      },
    },
  }

  const IntervalHighlightLayer = ({
    innerHeight,
    xScale,
  }: any) => {
    if (activeSliceIndex === null) return null

    const points = currentChartData[0].data

    const current = points[activeSliceIndex]

    if (!current) return null

    const currentX = xScale(current.x)

    const nextPoint = points[activeSliceIndex + 1]

    if (!nextPoint) return null

    const nextX = xScale(nextPoint.x)

    const width = nextX - currentX

    return (
      <g>
        <rect
          x={currentX}
          y={0}
          width={width}
          height={innerHeight}
          fill="rgba(59,130,246,0.18)"
          stroke="rgba(59,130,246,0.45)"
          strokeWidth={1.5}
        />
      </g>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden overflow-y-visible">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.15),transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(168,85,247,0.12),transparent_30%)]" />

      <div className="relative z-10 px-6 py-8 lg:px-12">
        <header className="flex flex-col gap-4 mb-10">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Energy Analytics
            </h1>

            <p className="text-slate-400 mt-3 text-lg max-w-2xl">
              Monitoriza o teu consumo energético em tempo real
              com gráficos fluidos e insights inteligentes.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          {stats.map(item => (
            <div
              key={item.title}
              className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl hover:scale-[1.02] transition-all"
            >
              <p className="text-slate-400 text-sm">
                {item.title}
              </p>

              <div className="flex items-end justify-between mt-4">
                <h2 className="text-3xl font-bold">
                  {item.value}
                </h2>

                <span className="text-emerald-400 font-medium">
                  {item.growth}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="relative z-50 xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 h-[520px] shadow-2xl">
            <div className="flex flex-col gap-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">
                    {chartTitle}
                  </h3>

                  <p className="text-slate-400 mt-1">
                    Visualização temporal do consumo energético
                  </p>
                </div>

                <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
                  <button
                    onClick={() => setSelectedRange('24h')}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-sm transition-all ${
                      selectedRange === '24h'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-blue-500/10'
                    }`}
                  >
                    24h
                  </button>

                  <button
                    onClick={() => setSelectedRange('7d')}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-sm transition-all ${
                      selectedRange === '7d'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-blue-500/10'
                    }`}
                  >
                    7d
                  </button>

                  <button
                    onClick={() => setSelectedRange('30d')}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-sm transition-all ${
                      selectedRange === '30d'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-blue-500/10'
                    }`}
                  >
                    30d
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRange('custom')
                      setShowCustomModal(true)
                    }}
                    className={`cursor-pointer px-4 py-2 rounded-xl text-sm transition-all ${
                      selectedRange === 'custom'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-blue-500/10'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>

            {showCustomModal && (
              <>
                <div
                  onClick={() => setShowCustomModal(false)}
                  className="fixed inset-0 z-[90]"
                />

                <div className="absolute top-24 right-6 z-[100] w-[340px] rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="font-semibold text-lg">
                      Intervalo personalizado
                    </h4>

                    <button
                      onClick={() => setShowCustomModal(false)}
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
                        value={customStartDate}
                        onChange={setCustomStartDate}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-slate-400">
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

            <div className="h-[340px] relative overflow-visible z-50">
              <ResponsiveLine
                layers={[
                  'grid',
                  'markers',
                  'axes',
                  'areas',
                  IntervalHighlightLayer,
                  'lines',
                  'points',
                  'slices',
                  'mesh',
                  'legends',
                ]}
                data={currentChartData}
                enableSlices="x"
                enableGridX={true}
                enableGridY={true}
                gridXValues={12}
                theme={chartTheme}
                margin={{
                  top: 20,
                  right: 20,
                  bottom: 60,
                  left: 60,
                }}
                xScale={{
                  type: 'point',
                }}
                yScale={{
                  type: 'linear',
                  min: 0,
                  max: 50,
                  stacked: false,
                }}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 12,
                  tickRotation: 0,

                  tickValues: currentChartData[0].data
                    .filter((_, index) => index % 2 === 0)
                    .map(item => item.x),

                  format: value => {
                    const item = currentChartData[0].data.find(
                      d => d.x === value
                    )

                    return item?.label || ''
                  },
                  legendOffset: 45,
                  legendPosition: 'middle',
                }}
                axisLeft={{
                  legend: 'kWh',
                  legendOffset: -45,
                  legendPosition: 'middle',
                }}
                curve="monotoneX"
                enableArea
                areaOpacity={0.15}
                enablePoints={true}
                pointSize={0}
                pointBorderWidth={0}
                useMesh
                animate={true}
                motionConfig="gentle"
                colors={['#3b82f6']}
                onMouseLeave={() => setActiveSliceIndex(null)}
                sliceTooltip={({ slice }) => {
                  const point = slice.points[0]

                  const pointIndex =
                    currentChartData[0].data.findIndex(
                      item => item.x === point.data.x
                    )

                  if (activeSliceIndex !== pointIndex) {
                    setActiveSliceIndex(pointIndex)
                  }

                  return (
                    <div className="rounded-xl bg-slate-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[260px]">

                      <div className="text-xs text-slate-400 mb-2">
                        Intervalo
                      </div>

                      <div className="text-white font-medium leading-relaxed">
                        {point.data.intervalLabel as string}
                      </div>

                      <div className="h-px bg-white/10 my-3" />

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          Consumo médio
                        </span>

                        <span className="text-blue-300 font-bold text-lg">
                          {point.data.yFormatted} kWh
                        </span>
                      </div>
                    </div>
                  )
                }}
              />
            </div>
          </div>

          <div className="relative z-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 h-[520px] shadow-2xl">
            <div className="mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">
                    Distribuição
                  </h3>

                  <p className="text-slate-400 mt-1">
                    Consumo por divisão
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
                  onClick={() =>
                    setShowDistributionCustomModal(false)
                  }
                  className="fixed inset-0 z-[90]"
                />

                <div className="absolute top-24 right-6 z-[100] w-[340px] rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <h4 className="font-semibold text-lg">
                      Intervalo personalizado
                    </h4>

                    <button
                      onClick={() =>
                        setShowDistributionCustomModal(false)
                      }
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
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 h-[350px] shadow-2xl">
            <div className="mb-4">
              <h3 className="text-2xl font-semibold">
                Consumo Diário
              </h3>

              <p className="text-slate-400 mt-1">
                Horas de maior utilização
              </p>
            </div>

            <div className="h-[250px]">
              <ResponsiveAreaBump
                data={[
                  {
                    id: 'Hoje',
                    data: Array.from({ length: 12 }).map(
                      (_, index) => ({
                        x: `${index * 2}:00`,
                        y: Math.floor(
                          Math.random() * 10
                        ),
                      })
                    ),
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
                colors={['#06b6d4']}
                blendMode="multiply"
                animate
                motionConfig="gentle"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-semibold">
                Insights Inteligentes
              </h3>

              <p className="text-slate-400 mt-1">
                Sugestões automáticas baseadas no consumo
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                <h4 className="font-semibold text-emerald-300">
                  Melhor horário
                </h4>

                <p className="text-slate-300 mt-2 leading-relaxed">
                  O menor consumo energético acontece entre
                  as 02:00 e as 06:00.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                <h4 className="font-semibold text-yellow-300">
                  Pico detetado
                </h4>

                <p className="text-slate-300 mt-2 leading-relaxed">
                  O maior pico de consumo acontece perto das
                  20:00.
                </p>
              </div>

              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <h4 className="font-semibold text-blue-300">
                  Recomendação
                </h4>

                <p className="text-slate-300 mt-2 leading-relaxed">
                  Transferir cargas pesadas para horários
                  noturnos pode reduzir custos mensais.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}