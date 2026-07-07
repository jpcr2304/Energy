import { useMemo } from 'react'
import { ResponsiveAreaBump } from '@nivo/bump'

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

function getMaxAllowedGapHours(selectedRange: Range) {
	if (selectedRange === '24h') return 2
	if (selectedRange === '7d') return 8
	if (selectedRange === '30d') return 24
	return 8
}

function formatDateLabel(date: Date) {
	return date.toLocaleDateString('pt-PT', {
		day: '2-digit',
		month: '2-digit',
	})
}

export default function DailyConsumptionChart({
	energyData,
	chartTheme,
	selectedRange,
	customStartDate,
	customEndDate,
	isDarkMode,
}: DailyConsumptionChartProps) {
	const chartData = useMemo(() => {
		const { start, end } = getSelectedRangeWindow(
			selectedRange,
			customStartDate,
			customEndDate
		)

		if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
			return []
		}

		const filteredData = energyData
			.filter(item => item.timestamp >= start && item.timestamp <= end)
			.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

		if (filteredData.length < 2) {
			return []
		}

		const maxAllowedGapHours = getMaxAllowedGapHours(selectedRange)

		const groupedByDay = new Map<
			string,
			{
				label: string
				values: number[]
			}
		>()

		for (let i = 1; i < filteredData.length; i++) {
			const previous = filteredData[i - 1]
			const current = filteredData[i]

			const durationHours =
				(current.timestamp.getTime() - previous.timestamp.getTime()) /
				(1000 * 60 * 60)

			const consumption = current.accumulated - previous.accumulated

			const hasValidGap =
				durationHours > 0 && durationHours <= maxAllowedGapHours

			const hasValidConsumption = consumption >= 0

			if (!hasValidGap || !hasValidConsumption) {
				continue
			}

			const dayKey = current.timestamp.toISOString().split('T')[0]
			const hourBucket = Math.floor(current.timestamp.getHours() / 2)

			if (!groupedByDay.has(dayKey)) {
				groupedByDay.set(dayKey, {
					label: formatDateLabel(current.timestamp),
					values: Array.from({ length: 12 }).map(() => 0),
				})
			}

			groupedByDay.get(dayKey)!.values[hourBucket] += consumption
		}

		const days = Array.from(groupedByDay.values()).slice(-7)

		if (days.length === 0) {
			return []
		}

		return days.map(day => ({
			id: day.label,
			data: day.values.map((value, index) => ({
				x: `${String(index * 2).padStart(2, '0')}:00`,
				y: Number(value.toFixed(2)),
			})),
		}))
	}, [
		energyData,
		selectedRange,
		customStartDate,
		customEndDate,
	])

	if (chartData.length === 0) {
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
						Hours with higher energy usage
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
					Hours with higher energy usage
				</p>
			</div>

			<div className="h-[420px]">
				<ResponsiveAreaBump
                    data={chartData}
                    theme={chartTheme}
                    margin={{
                        top: 40,
                        right: 80,
                        bottom: 50,
                        left: 60,
                    }}
                    spacing={8}
                    colors={{
                        scheme: 'category10',
                    }}
                    blendMode="normal"
                    fillOpacity={0.28}
                    startLabel={false}
                    endLabel
                    animate
                    motionConfig="gentle"
                />
			</div>
		</section>
	)
}