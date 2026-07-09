import { useMemo } from 'react'

type EnergyPoint = {
	timestamp: Date
	accumulated: number
}

type EnergyStatsCardsProps = {
	backendEnergyData: EnergyPoint[]
	isEnergyDataLoading: boolean
	mutedTextClasses: string
	statsCardClasses: string
}

export default function EnergyStatsCards({
	backendEnergyData,
	isEnergyDataLoading,
	mutedTextClasses,
	statsCardClasses,
}: EnergyStatsCardsProps) {
	const statsData = useMemo(() => {
		const now = new Date()

		const last24HoursStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)

		const previous24HoursStart = new Date(
			now.getTime() - 48 * 60 * 60 * 1000
		)

		const previous24HoursEnd = new Date(
			now.getTime() - 24 * 60 * 60 * 1000
		)

		const sortedData = [...backendEnergyData].sort(
			(a, b) => a.timestamp.getTime() - b.timestamp.getTime()
		)

		const minimumCoveragePercent = 90
		const maxConsumptionGapHours = 2
		const maxActiveGapMinutes = 5

		const calculatePeriodSummary = (start: Date, end: Date) => {
			const periodData = sortedData.filter(
				item => item.timestamp >= start && item.timestamp <= end
			)

			if (periodData.length < 2) {
				return {
					consumption: 0,
					coverageHours: 0,
					coveragePercent: 0,
					hasEnoughData: false,
				}
			}

			let total = 0
			let coveredMs = 0

			for (let i = 1; i < periodData.length; i++) {
				const previous = periodData[i - 1]
				const current = periodData[i]

				const durationMs =
					current.timestamp.getTime() - previous.timestamp.getTime()

				if (durationMs <= 0) {
					continue
				}

				const durationHours = durationMs / (1000 * 60 * 60)
				const durationMinutes = durationMs / (1000 * 60)

				const consumption = current.accumulated - previous.accumulated

				const hasValidConsumption = consumption >= 0

				if (
					durationHours <= maxConsumptionGapHours &&
					hasValidConsumption
				) {
					total += consumption
				}

				if (durationMinutes <= maxActiveGapMinutes) {
					coveredMs += durationMs
				}
			}

			const periodMs = end.getTime() - start.getTime()

			const coveragePercent =
				periodMs > 0 ? Math.min(100, (coveredMs / periodMs) * 100) : 0

			return {
				consumption: total,
				coverageHours: coveredMs / (1000 * 60 * 60),
				coveragePercent,
				hasEnoughData: coveragePercent >= minimumCoveragePercent,
			}
		}

		const calculatePeakForPeriod = (start: Date, end: Date) => {
			const periodData = sortedData.filter(
				item => item.timestamp >= start && item.timestamp <= end
			)

			if (periodData.length < 2) {
				return 0
			}

			const firstAvailablePoint = periodData[0]
			const lastAvailablePoint = periodData[periodData.length - 1]

			const startTime = firstAvailablePoint.timestamp.getTime()
			const endTime = lastAvailablePoint.timestamp.getTime()

			if (startTime === endTime) {
				return 0
			}

			const intervalDuration = (endTime - startTime) / 24

			const chartPoints = Array.from({ length: 25 }).map((_, index) => {
				const intervalStart = new Date(startTime + index * intervalDuration)
				const intervalEnd = new Date(startTime + (index + 1) * intervalDuration)

				const pointsInsideInterval = periodData.filter(
					item =>
						item.timestamp >= intervalStart &&
						item.timestamp <= intervalEnd
				)

				let y = 0

				if (pointsInsideInterval.length >= 2) {
					const firstPoint = pointsInsideInterval[0]
					const lastPoint = pointsInsideInterval[pointsInsideInterval.length - 1]

					const durationHours =
						(lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime()) /
						(1000 * 60 * 60)

					const consumption = lastPoint.accumulated - firstPoint.accumulated

					if (
						durationHours > 0 &&
						durationHours <= maxConsumptionGapHours &&
						consumption >= 0
					) {
						y = Number(consumption.toFixed(2))
					}
				}

				return { y }
			})

			if (chartPoints.length > 1) {
				const lastIndex = chartPoints.length - 1
				const previousPoint = chartPoints[lastIndex - 1]

				chartPoints[lastIndex] = {
					...chartPoints[lastIndex],
					y: previousPoint.y,
				}
			}

			const visiblePoints = chartPoints.slice(0, -1)

			if (visiblePoints.length === 0) {
				return 0
			}

			return Math.max(...visiblePoints.map(point => point.y))
		}

		const currentPeriod = calculatePeriodSummary(last24HoursStart, now)

		const previousPeriod = calculatePeriodSummary(
			previous24HoursStart,
			previous24HoursEnd
		)

		const hasCurrentData = currentPeriod.hasEnoughData
		const hasPreviousData = previousPeriod.hasEnoughData

		const canCompare =
			hasCurrentData &&
			hasPreviousData &&
			previousPeriod.consumption > 0

		const currentConsumption = currentPeriod.consumption
		const previousConsumption = previousPeriod.consumption

		const peakConsumption = hasCurrentData
			? calculatePeakForPeriod(last24HoursStart, now)
			: 0

		const previousPeakConsumption = hasPreviousData
			? calculatePeakForPeriod(previous24HoursStart, previous24HoursEnd)
			: 0

		const pricePerKwh = 0.20

		const estimatedCost = currentConsumption * pricePerKwh
		const previousEstimatedCost = previousConsumption * pricePerKwh

		const efficiency = canCompare
			? Math.max(
					0,
					Math.min(
						100,
						100 -
							((currentConsumption - previousConsumption) /
								previousConsumption) *
								100
					)
				)
			: 0

		const consumptionVariation = canCompare
			? ((currentConsumption - previousConsumption) / previousConsumption) * 100
			: 0

		const peakVariation =
			canCompare && previousPeakConsumption > 0
				? ((peakConsumption - previousPeakConsumption) /
						previousPeakConsumption) *
					100
				: 0

		const costVariation =
			canCompare && previousEstimatedCost > 0
				? ((estimatedCost - previousEstimatedCost) /
						previousEstimatedCost) *
					100
				: 0

		const efficiencyVariation = canCompare
			? currentConsumption <= previousConsumption
				? Math.abs(consumptionVariation)
				: -Math.abs(consumptionVariation)
			: 0

		return {
			currentConsumption,
			previousConsumption,
			peakConsumption,
			previousPeakConsumption,
			estimatedCost,
			previousEstimatedCost,
			efficiency,
			consumptionVariation,
			peakVariation,
			costVariation,
			efficiencyVariation,
			hasCurrentData,
			hasPreviousData,
			canCompare,
			currentCoveragePercent: currentPeriod.coveragePercent,
			previousCoveragePercent: previousPeriod.coveragePercent,
		}
	}, [backendEnergyData])

	const formatVariation = (value: number) => {
		if (value > 0) return `+${value.toFixed(0)}%`
		return `${value.toFixed(0)}%`
	}

	const isPositiveVariation = (
		value: number,
		lowerIsBetter: boolean
	) => {
		if (value === 0) return true

		return lowerIsBetter ? value < 0 : value > 0
	}

	const notEnoughDataLabel = isEnergyDataLoading ? 'Loading...' : 'Not enough data'

	const stats = [
		{
			title: 'Consumption 24h',
			value:
				statsData.hasCurrentData && !isEnergyDataLoading
					? `${statsData.currentConsumption.toFixed(2)} kWh`
					: notEnoughDataLabel,
			growth:
				statsData.canCompare && !isEnergyDataLoading
					? formatVariation(statsData.consumptionVariation)
					: notEnoughDataLabel,
			isPositive: isPositiveVariation(statsData.consumptionVariation, true),
			isNeutral: !statsData.canCompare || isEnergyDataLoading,
			description:
				'Total energy consumed in the last 24 hours. Change is only shown when both the current and previous 24 hours have at least 90% active data coverage.',
		},
		{
			title: 'Peak 24h',
			value:
				statsData.hasCurrentData && !isEnergyDataLoading
					? `${statsData.peakConsumption.toFixed(2)} kWh`
					: notEnoughDataLabel,
			growth:
				statsData.canCompare && !isEnergyDataLoading
					? formatVariation(statsData.peakVariation)
					: notEnoughDataLabel,
			isPositive: isPositiveVariation(statsData.peakVariation, true),
			isNeutral: !statsData.canCompare || isEnergyDataLoading,
			description:
				'Highest consumption interval shown in the last 24 hours. Change requires at least 90% active data coverage in both periods.',
		},
		{
			title: 'Estimated Cost 24h',
			value:
				statsData.hasCurrentData && !isEnergyDataLoading
					? `€${statsData.estimatedCost.toFixed(2)}`
					: notEnoughDataLabel,
			growth:
				statsData.canCompare && !isEnergyDataLoading
					? formatVariation(statsData.costVariation)
					: notEnoughDataLabel,
			isPositive: isPositiveVariation(statsData.costVariation, true),
			isNeutral: !statsData.canCompare || isEnergyDataLoading,
			description:
				'Estimated cost for the last 24 hours based on €0.20 per kWh. Change requires enough data in both periods.',
		},
		{
			title: 'Efficiency 24h',
			value:
				statsData.canCompare && !isEnergyDataLoading
					? `${statsData.efficiency.toFixed(0)}%`
					: notEnoughDataLabel,
			growth:
				statsData.canCompare && !isEnergyDataLoading
					? formatVariation(statsData.efficiencyVariation)
					: notEnoughDataLabel,
			isPositive: isPositiveVariation(statsData.efficiencyVariation, false),
			isNeutral: !statsData.canCompare || isEnergyDataLoading,
			description:
				'Compares the last 24 hours with the previous 24 hours. It is only calculated when both periods have at least 90% active data coverage.',
		},
	]

	return (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {stats.map(item => (
                <div
                    key={item.title}
                    className={`${statsCardClasses} group relative min-h-[130px] flex flex-col justify-between`}
                >
                    <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                        <p
                            className={`text-xs uppercase tracking-wide font-semibold ${mutedTextClasses}`}
                        >
                            {item.title}
                        </p>

                        <p
                            className={`text-xs uppercase tracking-wide font-semibold ${mutedTextClasses}`}
                        >
                            Change
                        </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] items-end gap-4">
                        <h3
							className={`font-bold whitespace-nowrap ${
								item.value === 'Not enough data' || item.value === 'Loading...'
									? 'text-lg'
									: 'text-3xl'
							}`}
						>
							{item.value}
						</h3>

						<span
							className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${
								item.isNeutral
									? 'bg-slate-500/10 text-slate-400'
									: item.isPositive
										? 'bg-emerald-500/10 text-emerald-400'
										: 'bg-rose-500/10 text-rose-500'
							}`}
						>
							{item.growth}
						</span>
                    </div>

                    <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-3 w-72 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 px-4 py-3 text-sm text-slate-300 opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100">
                        <p className="font-semibold text-white">
                            {item.title}
                        </p>

                        <p className="mt-1 leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                </div>
            ))}
        </section>
    )
}