import { useMemo, useRef, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type TemporalEnergyChartProps = {
  energyData: EnergyPoint[]
  chartTheme: any
  DatePartsInput: React.ComponentType<{
    value: string
    onChange: (value: string) => void
  }>
}

type Range = '24h' | '7d' | '30d' | 'custom'

function normalizeTo24Intervals(data: EnergyPoint[]): EnergyPoint[] {
  if (data.length <= 25) {
    return data
  }

  const result: EnergyPoint[] = []

  const startTime = data[0].timestamp.getTime()
  const endTime = data[data.length - 1].timestamp.getTime()

  const intervalDuration = (endTime - startTime) / 24

  result.push({
    timestamp: new Date(startTime),
    accumulated: data[0].accumulated,
  })

  let syntheticAccumulated = data[0].accumulated

  for (let i = 0; i < 24; i++) {
    const intervalStart = startTime + i * intervalDuration
    const intervalEnd = startTime + (i + 1) * intervalDuration

    const pointsInInterval = data.filter(
      item =>
        item.timestamp.getTime() >= intervalStart &&
        item.timestamp.getTime() <= intervalEnd
    )

    let averageConsumption = 0

    if (pointsInInterval.length > 1) {
      const first = pointsInInterval[0]
      const last = pointsInInterval[pointsInInterval.length - 1]

      const consumption = last.accumulated - first.accumulated

      const hours =
        (last.timestamp.getTime() - first.timestamp.getTime()) /
        (1000 * 60 * 60)

      averageConsumption = hours > 0 ? consumption / hours : 0
    }

    syntheticAccumulated +=
      averageConsumption * (intervalDuration / (1000 * 60 * 60))

    result.push({
      timestamp: new Date(intervalEnd),
      accumulated: syntheticAccumulated,
    })
  }

  return result
}

const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

export default function TemporalEnergyChart({
  energyData,
  chartTheme,
  DatePartsInput,
}: TemporalEnergyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  const [selectedRange, setSelectedRange] = useState<Range>('24h')

  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return formatDateInput(date)
  })

  const [customEndDate, setCustomEndDate] = useState(() => {
    return formatDateInput(new Date())
  })

  const [showCustomModal, setShowCustomModal] = useState(false)

  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null)

  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    point: any
  } | null>(null)

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
        item => item.timestamp >= start && item.timestamp <= end
      )
    } else {
      filtered = energyData.filter(item => item.timestamp >= startDate)
    }

    return normalizeTo24Intervals(filtered)
  }, [selectedRange, energyData, customStartDate, customEndDate])

  const currentChartData = useMemo(() => {
    return [
      {
        id: 'Energia',
        data: filteredData.map((item, index) => {
          const next = filteredData[index + 1]
          const previous = filteredData[index - 1]

          const startLabel =
            item.timestamp.toLocaleDateString('pt-PT', {
              day: '2-digit',
              month: '2-digit',
            }) +
            ' ' +
            item.timestamp.toLocaleTimeString('pt-PT', {
              hour: '2-digit',
              minute: '2-digit',
            })

          const endLabel = next
            ? next.timestamp.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
              }) +
              ' ' +
              next.timestamp.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : startLabel

          let y = 0

          if (next) {
            y = Number(
              (
                (next.accumulated - item.accumulated) /
                ((next.timestamp.getTime() - item.timestamp.getTime()) /
                  (1000 * 60 * 60))
              ).toFixed(1)
            )
          } else if (previous) {
            y = Number(
              (
                (item.accumulated - previous.accumulated) /
                ((item.timestamp.getTime() - previous.timestamp.getTime()) /
                  (1000 * 60 * 60))
              ).toFixed(1)
            )
          }

          return {
            x: `${index}`,
            label:
              selectedRange === '24h'
                ? item.timestamp.toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : item.timestamp.toLocaleDateString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                  }),
            intervalLabel: `${startLabel} → ${endLabel}`,
            y,
          }
        }),
      },
    ]
  }, [filteredData, selectedRange])

  const chartTitle = useMemo(() => {
    if (selectedRange === '24h') return 'Últimas 24 horas'
    if (selectedRange === '7d') return 'Últimos 7 dias'
    if (selectedRange === '30d') return 'Últimos 30 dias'
    return 'Intervalo personalizado'
  }, [selectedRange])

  const IntervalHoverLayer = ({ innerHeight, xScale }: any) => {
    const points = currentChartData[0].data

    return (
      <g>
        {points.slice(0, -1).map((point, index) => {
          const currentX = xScale(point.x)
          const nextX = xScale(points[index + 1].x)
          const width = nextX - currentX

          return (
            <rect
              key={point.x}
              x={currentX}
              y={0}
              width={width}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseMove={event => {
                if (!chartContainerRef.current) return

                const rect =
                  chartContainerRef.current.getBoundingClientRect()

                setActiveSliceIndex(index)

                setTooltip({
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                  point,
                })
              }}
              onMouseLeave={() => {
                setActiveSliceIndex(null)
                setTooltip(null)
              }}
            />
          )
        })}
      </g>
    )
  }

  const IntervalHighlightLayer = ({ innerHeight, xScale }: any) => {
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
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1.5}
        />
      </g>
    )
  }

  const yValues = currentChartData[0].data
    .slice(0, -1)
    .map(point => point.y)

  const maxY = yValues.length > 0 ? Math.max(...yValues) : 0

  return (
    <div className="relative z-50 xl:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 h-[520px] shadow-2xl">
      <div className="flex flex-col gap-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">{chartTitle}</h3>

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

      <div
        ref={chartContainerRef}
        className="h-[340px] relative overflow-visible z-50"
      >
        <ResponsiveLine
          layers={[
            'grid',
            'markers',
            'axes',
            'areas',
            IntervalHighlightLayer,
            'lines',
            'points',
            IntervalHoverLayer,
            'legends',
          ]}
          data={currentChartData}
          isInteractive={false}
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
            max: Math.ceil(maxY * 1.2),
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
            legend: 'kWh/h',
            legendOffset: -45,
            legendPosition: 'middle',
          }}
          curve="stepAfter"
          enableArea
          areaOpacity={0.15}
          enablePoints={false}
          animate={true}
          motionConfig="gentle"
          colors={['#3b82f6']}
          onMouseLeave={() => setActiveSliceIndex(null)}
        />

        {tooltip && (
          <div
            className="absolute z-[9999] pointer-events-none"
            style={{
              left: tooltip.x + 16,
              top: tooltip.y - 20,
            }}
          >
            <div className="rounded-xl bg-slate-950/95 backdrop-blur-xl px-4 py-3 shadow-2xl border border-white/10 min-w-[260px]">
              <div className="text-xs text-slate-400 mb-2">
                Intervalo
              </div>

              <div className="text-white font-medium leading-relaxed">
                {tooltip.point.intervalLabel}
              </div>

              <div className="h-px bg-white/10 my-3" />

              <div className="flex items-center justify-between">
                <span className="text-slate-400">
                  Consumo médio
                </span>

                <span className="text-blue-300 font-bold text-lg">
                  {tooltip.point.y} kWh
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}