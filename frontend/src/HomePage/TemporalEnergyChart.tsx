import { useMemo, useRef, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
}

type Range = '24h' | '7d' | '30d' | 'custom'

type TemporalEnergyChartProps = {
  energyData: EnergyPoint[]
  chartTheme: any
  selectedRange: Range
  customStartDate: string
  customEndDate: string
  isDarkMode: boolean
}

function normalizeTo24Intervals(
  data: EnergyPoint[],
  forceNormalize = false
): EnergyPoint[] {
  if (data.length === 0) {
    return []
  }

  if (data.length === 1) {
    return data
  }

  if (!forceNormalize && data.length <= 25) {
    return data
  }

  const result: EnergyPoint[] = []

  const startTime = data[0].timestamp.getTime()
  const endTime = data[data.length - 1].timestamp.getTime()

  if (startTime === endTime) {
    return data
  }

  const intervalDuration = (endTime - startTime) / 24

  result.push({
    timestamp: new Date(startTime),
    accumulated: data[0].accumulated,
  })

  for (let i = 0; i < 24; i++) {
    const intervalEnd = startTime + (i + 1) * intervalDuration

    const pointsBeforeOrAtEnd = data.filter(
      item => item.timestamp.getTime() <= intervalEnd
    )

    const endPoint =
      pointsBeforeOrAtEnd[pointsBeforeOrAtEnd.length - 1] ?? data[0]

    result.push({
      timestamp: new Date(intervalEnd),
      accumulated: endPoint.accumulated,
    })
  }

  return result
}

export default function TemporalEnergyChart({
  energyData,
  chartTheme,
  selectedRange,
  customStartDate,
  customEndDate,
  isDarkMode,
}: TemporalEnergyChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

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

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return []
      }

      filtered = energyData.filter(
        item => item.timestamp >= start && item.timestamp <= end
      )
    } else {
      filtered = energyData.filter(item => item.timestamp >= startDate)
    }

    if (filtered.length === 0) {
      return []
    }

    return normalizeTo24Intervals(filtered, selectedRange === 'custom')
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

  const IntervalHoverLayer = ({
    innerHeight,
    xScale,
  }: any) => {
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

                const rect = chartContainerRef.current.getBoundingClientRect()

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
          fill={
            isDarkMode
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(37,99,235,0.08)'
          }
          stroke={
            isDarkMode
              ? 'rgba(255,255,255,0.22)'
              : 'rgba(37,99,235,0.25)'
          }
          strokeWidth={1.5}
        />
      </g>
    )
  }

  const yValues = currentChartData[0].data
    .slice(0, -1)
    .map(point => point.y)

  const maxY = yValues.length > 0 ? Math.max(...yValues) : 0
  const computedMaxY = Math.max(1, Math.ceil(maxY * 1.2))

  const tooltipWidth = 256
  const tooltipOffset = 16

  const shouldShowTooltipOnLeft =
    tooltip &&
    chartContainerRef.current &&
    chartContainerRef.current.getBoundingClientRect().left +
      tooltip.x +
      tooltipOffset +
      tooltipWidth >
      window.innerWidth - 16

  const tooltipLeft = tooltip
    ? shouldShowTooltipOnLeft
      ? tooltip.x - tooltipWidth - tooltipOffset
      : tooltip.x + tooltipOffset
    : 0

  if (currentChartData[0].data.length === 0) {
    return (
      <section>
        <div className="mb-6">
          <h3
            className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-slate-950'
            }`}
          >
            {chartTitle}
          </h3>

          <p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
            Visualização temporal do consumo energético
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
    <section className="relative z-50">
      <div className="mb-6">
        <h3
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-slate-950'
          }`}
        >
          {chartTitle}
        </h3>

        <p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
          Visualização temporal do consumo energético
        </p>
      </div>

      <div
        ref={chartContainerRef}
        className="h-[420px] relative overflow-visible"
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
          enableGridX
          enableGridY
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
            max: computedMaxY,
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
              const item = currentChartData[0].data.find(d => d.x === value)
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
          animate
          motionConfig="gentle"
          colors={['#3b82f6']}
          onMouseLeave={() => setActiveSliceIndex(null)}
        />

        {tooltip && (
          <div
            className="absolute z-[9999] pointer-events-none"
            style={{
              left: tooltipLeft,
              top: tooltip.y - 60,
            }}
          >
            <div
              className={`rounded-xl px-4 py-3 shadow-2xl border min-w-[260px] ${
                isDarkMode
                  ? 'bg-slate-950/95 border-white/10'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div
                className={`text-xs mb-2 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Intervalo
              </div>

              <div
                className={`font-medium leading-relaxed ${
                  isDarkMode ? 'text-white' : 'text-slate-950'
                }`}
              >
                {tooltip.point.intervalLabel}
              </div>

              <div
                className={`h-px my-3 ${
                  isDarkMode ? 'bg-white/10' : 'bg-slate-200'
                }`}
              />

              <div className="flex items-center justify-between">
                <span
                  className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}
                >
                  Consumo médio
                </span>

                <span className="text-blue-400 font-bold text-lg">
                  {tooltip.point.y} kWh
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}