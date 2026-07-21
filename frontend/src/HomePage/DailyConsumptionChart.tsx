import { useMemo, useRef, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'

type EnergyPoint = {
	timestamp: Date
	accumulated: number
}

type Range = '24h' | '7d' | '30d' | 'custom'

type DailyConsumptionChartProps = {
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

function formatHour(hour: number) {
	return `${String(hour).padStart(2, '0')}:00`
}

function formatDateTime(date: Date) {
	return (
		date.toLocaleDateString('pt-PT', {
			day: '2-digit',
			month: '2-digit',
		}) +
		' ' +
		date.toLocaleTimeString('pt-PT', {
			hour: '2-digit',
			minute: '2-digit',
		})
	)
}

function getChartSubtitle(selectedRange: Range) {
	if (selectedRange === '24h') {
		return 'Energy consumed across the last 24 hours'
	}

	if (selectedRange === '7d') {
		return 'Average kWh used at each hour of the day across the last 7 days'
	}

	if (selectedRange === '30d') {
		return 'Average kWh used at each hour of the day across the last 30 days'
	}

	return 'Average kWh used at each hour of the day across the selected period'
}

function getAdaptiveMaxY(maxY: number) {
	if (maxY <= 0) {
		return 0.01
	}

	const paddedMax = maxY * 1.15
	const exponent = Math.floor(Math.log10(paddedMax))
	const magnitude = Math.pow(10, exponent)
	const normalized = paddedMax / magnitude

	const niceSteps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

	const niceStep =
		niceSteps.find(step => step >= normalized) ?? 10

	return Number((niceStep * magnitude).toPrecision(6))
}

function getLocalDayKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const MINIMUM_COVERAGE_PERCENT = 80
const SHOW_COVERAGE_BELOW_PERCENT = 95
const MAX_ACTIVE_GAP_MINUTES = 5

export default function DailyConsumptionChart({
	energyData,
	chartTheme,
	selectedRange,
	customStartDate,
	customEndDate,
	isDarkMode,
}: DailyConsumptionChartProps) {
	const chartContainerRef = useRef<HTMLDivElement | null>(null)

	const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null)
	const [tooltip, setTooltip] = useState<{
		x: number
		y: number
		point: any
	} | null>(null)

	const currentChartData = useMemo(() => {
		const { start, end } = getSelectedRangeWindow(
			selectedRange,
			customStartDate,
			customEndDate
		)

		if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
			return [
				{
					id: 'Energy consumption',
					data: [],
				},
			]
		}

		const filteredData = energyData
			.filter(item => item.timestamp >= start && item.timestamp <= end)
			.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

		if (selectedRange !== '24h' && filteredData.length < 2) {
			return [
				{
					id: 'Energy consumption',
					data: [],
				},
			]
		}

		const maxAllowedGapHours = 2

		if (selectedRange === '24h') {
			const startTime = start.getTime()
			const endTime = end.getTime()

			const intervalDuration = (endTime - startTime) / 24

			const chartPoints = Array.from({ length: 24 }).map((_, index) => {
				const intervalStart = new Date(
					startTime + index * intervalDuration
				)

				const intervalEnd = new Date(
					startTime + (index + 1) * intervalDuration
				)

				const pointsInsideInterval = filteredData.filter(
					item =>
						item.timestamp >= intervalStart &&
						(index === 23
							? item.timestamp <= intervalEnd
							: item.timestamp < intervalEnd)
				)

				let y = 0
				let hasMissingData = false
				let coveragePercent = 0

				if (pointsInsideInterval.length >= 2) {
					let coveredMs = 0

					for (
						let pointIndex = 1;
						pointIndex < pointsInsideInterval.length;
						pointIndex++
					) {
						const previousPoint =
							pointsInsideInterval[pointIndex - 1]

						const currentPoint =
							pointsInsideInterval[pointIndex]

						const durationMs =
							currentPoint.timestamp.getTime() -
							previousPoint.timestamp.getTime()

						if (durationMs <= 0) {
							continue
						}

						const durationMinutes =
							durationMs / (1000 * 60)

						if (
							durationMinutes <= MAX_ACTIVE_GAP_MINUTES
						) {
							coveredMs += durationMs
						}
					}

					const intervalMs =
						intervalEnd.getTime() -
						intervalStart.getTime()

					coveragePercent =
						intervalMs > 0
							? Math.min(
									100,
									(coveredMs / intervalMs) * 100
								)
							: 0

					const hasEnoughCoverage =
						coveragePercent >= MINIMUM_COVERAGE_PERCENT

					if (hasEnoughCoverage) {
						const firstPoint = pointsInsideInterval[0]

						const lastPoint =
							pointsInsideInterval[
								pointsInsideInterval.length - 1
							]

						const durationHours =
							(lastPoint.timestamp.getTime() -
								firstPoint.timestamp.getTime()) /
							(1000 * 60 * 60)

						const consumption =
							lastPoint.accumulated -
							firstPoint.accumulated

						if (
							durationHours > 0 &&
							durationHours <= maxAllowedGapHours &&
							consumption >= 0
						) {
							y = Number(consumption.toFixed(2))
						} else {
							hasMissingData = true
						}
					} else {
						hasMissingData = true
					}
				} else {
					hasMissingData = true
				}

				return {
					x: `${index}`,
					label: intervalStart.toLocaleTimeString(
						'pt-PT',
						{
							hour: '2-digit',
							minute: '2-digit',
						}
					),
					intervalLabel: `${formatDateTime(intervalStart)} → ${formatDateTime(intervalEnd)}`,
					y,
					hasMissingData,
					coveragePercent: Number(
						coveragePercent.toFixed(0)
					),
					valueLabel: 'Consumption',
				}
			})

			const lastPoint = chartPoints[chartPoints.length - 1]

			const extendedChartPoints = [
				...chartPoints,
				{
					...lastPoint,
					x: '24',
					label: end.toLocaleTimeString('pt-PT', {
						hour: '2-digit',
						minute: '2-digit',
					}),
				},
			]

			return [
				{
					id: 'Energy consumption',
					data: extendedChartPoints,
				},
			]
		}

		const expectedCoverageMinutesByHour =
			Array.from({ length: 24 }, () => 0)

		let expectedCursor = new Date(start)

		while (expectedCursor < end) {
			const nextHour = new Date(expectedCursor)

			nextHour.setHours(
				expectedCursor.getHours() + 1,
				0,
				0,
				0
			)

			const segmentEnd = new Date(
				Math.min(nextHour.getTime(), end.getTime())
			)

			const expectedMinutes =
				(segmentEnd.getTime() - expectedCursor.getTime()) /
				(1000 * 60)

			if (expectedMinutes > 0) {
				expectedCoverageMinutesByHour[
					expectedCursor.getHours()
				] += expectedMinutes
			}

			expectedCursor = segmentEnd
		}

		const hourlyConsumptionByDay = Array.from({ length: 24 }).map(
			() => new Map<string, number>()
		)

		const hourlyCoverageByDay = Array.from({ length: 24 }).map(
			() => new Map<string, number>()
		)

		for (let i = 1; i < filteredData.length; i++) {
			const previous = filteredData[i - 1]
			const current = filteredData[i]

			const durationMs =
				current.timestamp.getTime() - previous.timestamp.getTime()

			const durationMinutes = durationMs / (1000 * 60)

			const consumption =
				current.accumulated - previous.accumulated

			const hasValidGap =
				durationMinutes > 0 &&
				durationMinutes <= MAX_ACTIVE_GAP_MINUTES

			const hasValidConsumption = consumption >= 0

			if (!hasValidGap || !hasValidConsumption) {
				continue
			}

			let segmentStart = new Date(previous.timestamp)
			const intervalEnd = new Date(current.timestamp)

			while (segmentStart < intervalEnd) {
				const nextHourStart = new Date(segmentStart)
				nextHourStart.setHours(segmentStart.getHours() + 1, 0, 0, 0)

				const segmentEnd = new Date(
					Math.min(nextHourStart.getTime(), intervalEnd.getTime())
				)

				const segmentMs =
					segmentEnd.getTime() - segmentStart.getTime()

				if (segmentMs <= 0) {
					break
				}

				const segmentConsumption =
					consumption * (segmentMs / durationMs)

				const segmentCoverageMinutes = segmentMs / (1000 * 60)

				const hour = segmentStart.getHours()
				const dayKey = getLocalDayKey(segmentStart)

				const currentHourDayConsumption =
					hourlyConsumptionByDay[hour].get(dayKey) ?? 0

				const currentHourDayCoverage =
					hourlyCoverageByDay[hour].get(dayKey) ?? 0

				hourlyConsumptionByDay[hour].set(
					dayKey,
					currentHourDayConsumption + segmentConsumption
				)

				hourlyCoverageByDay[hour].set(
					dayKey,
					currentHourDayCoverage + segmentCoverageMinutes
				)

				segmentStart = segmentEnd
			}
		}

		const hasValues = hourlyConsumptionByDay.some(hourMap => hourMap.size > 0)

		if (!hasValues) {
			return [
				{
					id: 'Energy consumption',
					data: [],
				},
			]
		}

		const chartPoints = Array.from({ length: 24 }).map((_, hour) => {
			const nextHour = hour + 1

			const totalCoveredMinutes = Array.from(
				hourlyCoverageByDay[hour].values()
			).reduce((sum, coverage) => sum + coverage, 0)

			const expectedCoverageMinutes =
				expectedCoverageMinutesByHour[hour]

			const coveragePercent =
				expectedCoverageMinutes > 0
					? Math.min(
							100,
							(totalCoveredMinutes / expectedCoverageMinutes) * 100
						)
					: 0

			const hasEnoughCoverage =
				coveragePercent >= MINIMUM_COVERAGE_PERCENT

			const validDayValues = Array.from(
				hourlyConsumptionByDay[hour].entries()
			)
				.filter(([dayKey]) => {
					const coverageMinutes =
						hourlyCoverageByDay[hour].get(dayKey) ?? 0

					const dayCoveragePercent =
						(coverageMinutes / 60) * 100

					return (
						dayCoveragePercent >= MINIMUM_COVERAGE_PERCENT
					)
				})
				.map(([, value]) => value)

			const canShowValue =
				hasEnoughCoverage && validDayValues.length > 0

			const averageConsumption = canShowValue
				? validDayValues.reduce(
						(sum, value) => sum + value,
						0
					) / validDayValues.length
				: 0

			return {
				x: `${hour}`,
				label: formatHour(hour),
				intervalLabel: `${formatHour(hour)} → ${
					nextHour === 24
						? '24:00'
						: formatHour(nextHour)
				}`,
				y: Number(averageConsumption.toFixed(2)),
				hasMissingData: !canShowValue,
				coveragePercent: Number(
					coveragePercent.toFixed(0)
				),
				valueLabel: 'Average hourly consumption',
			}
		})

		const lastPoint = chartPoints[chartPoints.length - 1]

		const extendedChartPoints = [
			...chartPoints,
			{
				...lastPoint,
				x: '24',
				label: '24:00',
			},
		]

		return [
			{
				id: 'Energy consumption',
				data: extendedChartPoints,
			},
		]
	}, [
		energyData,
		selectedRange,
		customStartDate,
		customEndDate,
	])

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
	const computedMaxY = getAdaptiveMaxY(maxY)

	const yTickValues = Array.from({ length: 6 }).map((_, index) =>
		Number(((computedMaxY / 5) * index).toFixed(4))
	)

	const tooltipWidth = tooltip?.point.hasMissingData ? 320 : 280
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
						Daily Consumption
					</h3>

					<p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
						Average kWh used at each hour of the day
					</p>
				</div>

				<div
					className={`rounded-2xl border border-dashed px-6 py-16 text-center ${
						isDarkMode
							? 'border-white/10 text-slate-400'
							: 'border-slate-300 text-slate-500'
					}`}
				>
					No data available for the selected range.
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
					Daily Consumption
				</h3>

				<p className={isDarkMode ? 'text-slate-400 mt-1' : 'text-slate-500 mt-1'}>
					{getChartSubtitle(selectedRange)}
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
						tickSize: 0,
						tickPadding: 12,
						tickRotation: 0,
						tickValues: yTickValues,
						legend: selectedRange === '24h' ? 'kWh' : 'Average kWh',
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
							className={`rounded-xl px-4 py-3 shadow-2xl border ${
								tooltip.point.hasMissingData ? 'min-w-[320px]' : 'min-w-[280px]'
							} ${
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
								{selectedRange === '24h' ? 'Interval' : 'Hour interval'}
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
									{tooltip.point.valueLabel}
								</span>

								<span className="text-blue-400 font-bold text-lg whitespace-nowrap text-right">
									{tooltip.point.hasMissingData
										? 'Not enough data'
										: `${tooltip.point.y} kWh${
												typeof tooltip.point.coveragePercent === 'number' &&
												tooltip.point.coveragePercent <
													SHOW_COVERAGE_BELOW_PERCENT
													? ` (${tooltip.point.coveragePercent}% coverage)`
													: ''
											}`}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	)
}