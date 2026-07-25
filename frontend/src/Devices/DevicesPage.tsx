import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type DevicesPageProps = {
  isDarkMode: boolean
}

type DeviceType = 'shelly-em' | 'shelly-pro' | 'mqtt'

type DeviceOption = {
  id: DeviceType
  name: string
  description: string
  badge?: string
}

const deviceOptions: DeviceOption[] = [
  {
    id: 'shelly-em',
    name: 'Shelly EM Gen3',
    description: 'Connect a Shelly energy monitor over your local network.',
    badge: 'Recommended',
  },
  {
    id: 'shelly-pro',
    name: 'Shelly Pro 3EM',
    description: 'Monitor up to three phases with real-time measurements.',
  },
  {
    id: 'mqtt',
    name: 'MQTT device',
    description: 'Use any compatible meter that publishes energy data via MQTT.',
  },
]

function DeviceIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M10 17h4" />
    </svg>
  )
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function WifiIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.9 9.3a10.5 10.5 0 0 1 14.2 0" />
      <path d="M7.8 12.3a6.3 6.3 0 0 1 8.4 0" />
      <path d="M10.5 15.3a2.3 2.3 0 0 1 3 0" />
      <circle cx="12" cy="18.4" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ActivityIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h4l2.4-6 4.1 12 2.4-6H21" />
    </svg>
  )
}

function ShieldIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 5.5 5.7v5.8c0 4.2 2.7 7.7 6.5 9.5 3.8-1.8 6.5-5.3 6.5-9.5V5.7L12 3Z" />
      <path d="m9.2 12 1.8 1.8 3.9-4" />
    </svg>
  )
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function ArrowLeftIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export default function DevicesPage({ isDarkMode }: DevicesPageProps) {
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<1 | 2>(1)
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('shelly-em')
  const [deviceName, setDeviceName] = useState('Home energy monitor')
  const [deviceAddress, setDeviceAddress] = useState('')

  const mutedTextClasses = isDarkMode ? 'text-slate-400' : 'text-slate-500'
  const panelClasses = isDarkMode
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-slate-200 bg-white'
  const inputClasses = isDarkMode
    ? 'border-white/10 bg-slate-950 text-white placeholder:text-slate-600 focus:border-blue-500/70'
    : 'border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500'

  const openSetup = (device: DeviceType = 'shelly-em') => {
    setSelectedDevice(device)
    setSetupStep(1)
    setShowSetup(true)
  }

  const closeSetup = () => {
    setShowSetup(false)
  }

  useEffect(() => {
    if (!showSetup) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSetup(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSetup])

  return (
    <section className="pt-8 pb-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-500">
            Device management
          </p>
          <h2 className="text-4xl font-bold tracking-tight">Devices</h2>
          <p className={`mt-2 max-w-2xl ${mutedTextClasses}`}>
            Connect an energy monitor to start collecting and visualising your
            home&apos;s live consumption data.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openSetup()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          Connect device
        </button>
      </div>

      <div
        className={`relative mt-8 overflow-hidden rounded-3xl border p-7 sm:p-9 ${panelClasses}`}
      >

        <div className="relative grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <div
              className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${
                isDarkMode
                  ? 'bg-blue-500/15 text-blue-400'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              <DeviceIcon className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-bold">Connect your first device</h3>
            <p className={`mt-3 max-w-xl leading-7 ${mutedTextClasses}`}>
              Volt will use readings from your monitor to build the charts,
              statistics and insights shown in your dashboard.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openSetup()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Start setup
                <ChevronRightIcon className="h-4 w-4" />
              </button>

              <a
                href="#connection-guide"
                className={`inline-flex items-center rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                  isDarkMode
                    ? 'border-white/10 hover:bg-white/5'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                How it works
              </a>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isDarkMode
                ? 'border-white/10 bg-slate-950/70'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${mutedTextClasses}`}>Your devices</p>
                <p className="mt-1 text-3xl font-bold">0</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                No devices yet
              </span>
            </div>

            <div className={`my-5 h-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs uppercase tracking-wide ${mutedTextClasses}`}>
                  Data status
                </p>
                <p className="mt-1 text-sm font-semibold">Waiting for device</p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wide ${mutedTextClasses}`}>
                  Last reading
                </p>
                <p className="mt-1 text-sm font-semibold">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-5">
          <h3 className="text-xl font-bold">Supported devices</h3>
          <p className={`mt-1 text-sm ${mutedTextClasses}`}>
            Choose the device you want to configure.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {deviceOptions.map(device => (
            <button
              key={device.id}
              type="button"
              onClick={() => openSetup(device.id)}
              className={`group cursor-pointer rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
                isDarkMode
                  ? 'border-white/10 bg-white/[0.04] hover:border-blue-500/40 hover:bg-white/[0.07]'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isDarkMode
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {device.id === 'mqtt' ? (
                    <WifiIcon className="h-5 w-5" />
                  ) : (
                    <DeviceIcon className="h-5 w-5" />
                  )}
                </div>

                {device.badge && (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isDarkMode
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {device.badge}
                  </span>
                )}
              </div>

              <h4 className="mt-5 font-semibold">{device.name}</h4>
              <p className={`mt-2 min-h-10 text-sm leading-5 ${mutedTextClasses}`}>
                {device.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-blue-500">
                Configure
                <ChevronRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </div>

      <div id="connection-guide" className="mt-10 scroll-mt-28">
        <div className="mb-5">
          <h3 className="text-xl font-bold">How connection works</h3>
          <p className={`mt-1 text-sm ${mutedTextClasses}`}>
            Three quick steps to bring energy readings into Volt.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              number: '01',
              title: 'Choose your monitor',
              description: 'Select your model or use the generic MQTT option.',
              icon: <DeviceIcon className="h-5 w-5" />,
            },
            {
              number: '02',
              title: 'Connect it securely',
              description: 'Provide its local address and confirm the data source.',
              icon: <ShieldIcon className="h-5 w-5" />,
            },
            {
              number: '03',
              title: 'Start receiving data',
              description: 'Volt checks the readings before adding them to your charts.',
              icon: <ActivityIcon className="h-5 w-5" />,
            },
          ].map(step => (
            <div
              key={step.number}
              className={`rounded-2xl border p-5 ${panelClasses}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.18em] text-blue-500">
                  STEP {step.number}
                </span>
                <span className={mutedTextClasses}>{step.icon}</span>
              </div>
              <h4 className="mt-5 font-semibold">{step.title}</h4>
              <p className={`mt-2 text-sm leading-6 ${mutedTextClasses}`}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showSetup && (
          <>
            <motion.button
              type="button"
              aria-label="Close device setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSetup}
              className="fixed inset-0 z-[60] cursor-default bg-black/55 backdrop-blur-sm"
            />

            <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="device-setup-title"
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 28, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={`pointer-events-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border shadow-2xl ${
                  isDarkMode
                    ? 'border-white/10 bg-slate-950'
                    : 'border-slate-200 bg-white'
                }`}
              >
              <div
                className={`sticky top-0 z-10 flex items-start justify-between border-b px-6 py-5 ${
                  isDarkMode
                    ? 'border-white/10 bg-slate-950'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-blue-500">
                    Step {setupStep} of 2
                  </p>
                  <h3 id="device-setup-title" className="mt-1 text-xl font-bold">
                    {setupStep === 1 ? 'Choose a device' : 'Device details'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={closeSetup}
                  aria-label="Close device setup"
                  className={`cursor-pointer rounded-lg p-2 transition ${
                    isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  }`}
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <AnimatePresence mode="wait" initial={false}>
                  {setupStep === 1 ? (
                    <motion.div
                      key="device-selection"
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.16 }}
                      className="space-y-3"
                    >
                      {deviceOptions.map(device => {
                        const isSelected = selectedDevice === device.id

                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => setSelectedDevice(device.id)}
                            className={`flex w-full cursor-pointer items-center gap-4 rounded-2xl border p-4 text-left transition ${
                              isSelected
                                ? isDarkMode
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-blue-500 bg-blue-50'
                                : isDarkMode
                                  ? 'border-white/10 hover:bg-white/5'
                                  : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                isDarkMode
                                  ? 'bg-white/5 text-blue-400'
                                  : 'bg-white text-blue-600'
                              }`}
                            >
                              {device.id === 'mqtt' ? (
                                <WifiIcon className="h-5 w-5" />
                              ) : (
                                <DeviceIcon className="h-5 w-5" />
                              )}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold">{device.name}</span>
                              <span className={`mt-1 block text-sm ${mutedTextClasses}`}>
                                {device.description}
                              </span>
                            </span>

                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-500 text-white'
                                  : isDarkMode
                                    ? 'border-white/20'
                                    : 'border-slate-300'
                              }`}
                            >
                              {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                            </span>
                          </button>
                        )
                      })}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="device-details"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div
                        className={`mb-6 flex items-center gap-4 rounded-2xl border p-4 ${panelClasses}`}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                            isDarkMode
                              ? 'bg-blue-500/15 text-blue-400'
                              : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          {selectedDevice === 'mqtt' ? (
                            <WifiIcon className="h-5 w-5" />
                          ) : (
                            <DeviceIcon className="h-5 w-5" />
                          )}
                        </span>
                        <div>
                          <p className="font-semibold">
                            {
                              deviceOptions.find(device => device.id === selectedDevice)
                                ?.name
                            }
                          </p>
                          <p className={`text-sm ${mutedTextClasses}`}>
                            Local network connection
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold">
                            Device name
                          </span>
                          <input
                            type="text"
                            value={deviceName}
                            onChange={event => setDeviceName(event.target.value)}
                            placeholder="e.g. Main electrical panel"
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold">
                            IP address or hostname
                          </span>
                          <input
                            type="text"
                            value={deviceAddress}
                            onChange={event => setDeviceAddress(event.target.value)}
                            placeholder="e.g. 192.168.1.50"
                            className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                          />
                        </label>
                      </div>

                      <div
                        className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                          isDarkMode
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        Device verification will become available when the
                        connection backend is added. This page currently stores
                        and sends no device information.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div
                className={`flex items-center justify-between gap-3 border-t px-6 py-5 ${
                  isDarkMode ? 'border-white/10' : 'border-slate-200'
                }`}
              >
                {setupStep === 1 ? (
                  <button
                    type="button"
                    onClick={closeSetup}
                    className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSetupStep(1)}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                    }`}
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                  </button>
                )}

                {setupStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => setSetupStep(2)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Continue
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Requires the device connection backend"
                    className="cursor-not-allowed rounded-xl bg-blue-600/50 px-5 py-2.5 text-sm font-semibold text-white/70"
                  >
                    Verify &amp; connect
                  </button>
                )}
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}