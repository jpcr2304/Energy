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

function getSelectedRangeWindow(
  selectedRange: Range,
  customStartDate: string,
  customEndDate: string
) {
  const now = new Date()
  let start = new Date(now)

  if (selectedRange === '24h') {
    start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  if (selectedRange === '7d') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  if (selectedRange === '30d') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }

  if (selectedRange === 'custom') {
    const [startYear, startMonth, startDay] =
      customStartDate.split('-').map(Number)

    const [endYear, endMonth, endDay] =
      customEndDate.split('-').map(Number)

    return {
      start: new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0),
      end: new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999),
    }
  }

  return {
    start,
    end: now,
  }
}

function getMaxAllowedGapHours(selectedRange: Range) {
  if (selectedRange === '24h') return 2
  if (selectedRange === '7d') return 8
  if (selectedRange === '30d') return 24
  return 8
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
    const { start, end } = getSelectedRangeWindow(
      selectedRange,
      customStartDate,
      customEndDate
    )

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return []
    }

    return energyData
      .filter(item => item.timestamp >= start && item.timestamp <= end)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [selectedRange, energyData, customStartDate, customEndDate])

  const currentChartData = useMemo(() => {
    if (filteredData.length < 2) {
      return [
        {
          id: 'Energia',
          data: [],
        },
      ]
    }

    const maxAllowedGapHours = getMaxAllowedGapHours(selectedRange)

    const firstAvailablePoint = filteredData[0]
    const lastAvailablePoint = filteredData[filteredData.length - 1]

    const startTime = firstAvailablePoint.timestamp.getTime()
    const endTime = lastAvailablePoint.timestamp.getTime()

    if (startTime === endTime) {
      return [
        {
          id: 'Energia',
          data: [],
        },
      ]
    }

    const intervalDuration = (endTime - startTime) / 24

    const chartPoints = Array.from({ length: 25 }).map((_, index) => {
      const intervalStart = new Date(startTime + index * intervalDuration)
      const intervalEnd = new Date(startTime + (index + 1) * intervalDuration)

      const pointsInsideInterval = filteredData.filter(
        item =>
          item.timestamp >= intervalStart &&
          item.timestamp <= intervalEnd
      )

      const startLabel =
        intervalStart.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
        }) +
        ' ' +
        intervalStart.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        })

      const endLabel =
        intervalEnd.toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
        }) +
        ' ' +
        intervalEnd.toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        })

      let y = 0
      let hasMissingData = false

      if (pointsInsideInterval.length >= 2) {
        const firstPoint = pointsInsideInterval[0]
        const lastPoint = pointsInsideInterval[pointsInsideInterval.length - 1]

        const durationHours =
          (lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) /
          (1000 * 60 * 60)

        const consumption = lastPoint.accumulated - firstPoint.accumulated

        if (
          durationHours > 0 &&
          durationHours <= maxAllowedGapHours &&
          consumption >= 0
        ) {
          y = Number(consumption.toFixed(2))
        } else {
          y = 0
          hasMissingData = true
        }
      } else {
        y = 0
        hasMissingData = true
      }

      return {
        x: `${index}`,
        label:
          selectedRange === '24h'
            ? intervalStart.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : intervalStart.toLocaleDateString('pt-PT', {
                day: '2-digit',
                month: '2-digit',
              }),
        intervalLabel: `${startLabel} → ${endLabel}`,
        y,
        hasMissingData,
      }
    })

    if (chartPoints.length > 1) {
      const lastIndex = chartPoints.length - 1
      const previousPoint = chartPoints[lastIndex - 1]

      chartPoints[lastIndex] = {
        ...chartPoints[lastIndex],
        y: previousPoint.y,
        hasMissingData: previousPoint.hasMissingData,
      }
    }

    return [
      {
        id: 'Energia',
        data: chartPoints,
      },
    ]
  }, [
    filteredData,
    selectedRange,
  ])

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
    .filter((value): value is number => typeof value === 'number')

  const maxY = yValues.length > 0 ? Math.max(...yValues) : 0
  const computedMaxY = Math.max(1, Math.ceil(maxY * 1.2))

  const tooltipWidth = tooltip?.point.hasMissingData ? 320 : 260
  const tooltipOffset = 20

  const shouldShowTooltipOnLeft =
    tooltip &&
    chartContainerRef.current &&
    chartContainerRef.current.getBoundingClientRect().left +
      tooltip.x +
      tooltipOffset +
      tooltipWidth >
      window.innerWidth - 50

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
            legend: 'kWh',
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
              className={`rounded-xl px-4 py-3 shadow-2xl border ${tooltip.point.hasMissingData ? 'min-w-[320px]' : 'min-w-[260px]'} ${
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

              <div className="flex items-center justify-between gap-6">
                <span
                  className={`whitespace-nowrap ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Consumption
                </span>

                <span className="text-blue-400 font-bold text-lg whitespace-nowrap text-right">
                  {tooltip.point.hasMissingData ? 'Not enough data' : `${tooltip.point.y} kWh`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}