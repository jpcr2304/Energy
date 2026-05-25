import { useMemo, useState } from 'react'
import { ResponsiveAreaBump } from '@nivo/bump'
import TemporalEnergyChart from './TemporalEnergyChart'
import EnergyDistributionChart from './EnergyDistributionChart'

type EnergyPoint = {
  timestamp: Date
  accumulated: number
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

  const formatDateInput = (date: Date) => date.toISOString().split('T')[0]

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
          <TemporalEnergyChart
            energyData={energyData}
            chartTheme={chartTheme}
            DatePartsInput={DatePartsInput}
          />

          <EnergyDistributionChart
            energyData={energyData}
            chartTheme={chartTheme}
            DatePartsInput={DatePartsInput}
          />
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