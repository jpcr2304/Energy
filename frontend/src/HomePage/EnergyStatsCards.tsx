import { useMemo } from 'react'

type EnergyPoint = {
	timestamp: Date
	accumulated: number
}

type EnergyStatsCardsProps = {
	backendEnergyData: EnergyPoint[]
	mutedTextClasses: string
	statsCardClasses: string
}

export default function EnergyStatsCards({
	backendEnergyData,
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

		const calculateConsumptionForPeriod = (start: Date, end: Date) => {
			const periodData = sortedData.filter(
				item => item.timestamp >= start && item.timestamp <= end
			)

			if (periodData.length < 2) {
				return 0
			}

			let total = 0

			for (let i = 1; i < periodData.length; i++) {
				const previous = periodData[i - 1]
				const current = periodData[i]

				const durationHours =
					(current.timestamp.getTime() - previous.timestamp.getTime()) /
					(1000 * 60 * 60)

				const consumption = current.accumulated - previous.accumulated

				const hasValidGap = durationHours > 0 && durationHours <= 2
				const hasValidConsumption = consumption >= 0

				if (hasValidGap && hasValidConsumption) {
					total += consumption
				}
			}

			return total
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

			const maxAllowedGapHours = 2
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
						durationHours <= maxAllowedGapHours &&
						consumption >= 0
					) {
						y = Number(consumption.toFixed(2))
					}
				}

				return {
					y,
				}
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

		const currentConsumption = calculateConsumptionForPeriod(
			last24HoursStart,
			now
		)

		const previousConsumption = calculateConsumptionForPeriod(
			previous24HoursStart,
			previous24HoursEnd
		)

		const peakConsumption = calculatePeakForPeriod(last24HoursStart, now)

		const previousPeakConsumption = calculatePeakForPeriod(
			previous24HoursStart,
			previous24HoursEnd
		)

		const pricePerKwh = 0.20
		const estimatedCost = currentConsumption * pricePerKwh
		const previousEstimatedCost = previousConsumption * pricePerKwh

		const efficiency =
			previousConsumption > 0
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
				: 100

		const consumptionVariation =
			previousConsumption > 0
				? ((currentConsumption - previousConsumption) /
						previousConsumption) *
					100
				: 0

		const peakVariation =
			previousPeakConsumption > 0
				? ((peakConsumption - previousPeakConsumption) /
						previousPeakConsumption) *
					100
				: 0

		const costVariation =
			previousEstimatedCost > 0
				? ((estimatedCost - previousEstimatedCost) /
						previousEstimatedCost) *
					100
				: 0

		const efficiencyVariation =
			previousConsumption > 0
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

	const stats = [
        {
            title: 'Consumption 24h',
            value: `${statsData.currentConsumption.toFixed(2)} kWh`,
            growth: formatVariation(statsData.consumptionVariation),
            isPositive: isPositiveVariation(statsData.consumptionVariation, true),
            description:
                'Total energy consumed in the last 24 hours, calculated from real accumulated energy readings.',
        },
        {
            title: 'Peak 24h',
            value: `${statsData.peakConsumption.toFixed(2)} kWh`,
            growth: formatVariation(statsData.peakVariation),
            isPositive: isPositiveVariation(statsData.peakVariation, true),
            description:
                'Highest consumption interval shown in the last 24 hours, using the same interval logic as the temporal chart.',
        },
        {
            title: 'Estimated Cost 24h',
            value: `€${statsData.estimatedCost.toFixed(2)}`,
            growth: formatVariation(statsData.costVariation),
            isPositive: isPositiveVariation(statsData.costVariation, true),
            description:
                'Estimated cost for the last 24 hours based on the configured electricity price of €0.20 per kWh.',
        },
        {
            title: 'Efficiency 24h',
            value: `${statsData.efficiency.toFixed(0)}%`,
            growth: formatVariation(statsData.efficiencyVariation),
            isPositive: isPositiveVariation(statsData.efficiencyVariation, false),
            description:
                'Compares the last 24 hours with the previous 24 hours. Higher efficiency means consumption was lower than before.',
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
                        <h3 className="text-3xl font-bold whitespace-nowrap">
                            {item.value}
                        </h3>

                        <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${
                                item.isPositive
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