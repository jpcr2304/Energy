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

type ConfiguredDevice = {
  id: number
  name: string
  type: DeviceType
  brokerUrl: string
  deviceIdentifier: string | null
  topic: string
  username: string | null
  hasPassword: boolean
  totalChannels: number[]
  enabled: boolean
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR'
  lastSeenAt: string | null
  lastError: string | null
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

const deviceStatusLabels: Record<ConfiguredDevice['status'], string> = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'waiting for data',
  CONNECTED: 'connected',
  ERROR: 'not detected',
}

function parseMqttChannels(value: string): number[] | null {
  const parts = value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  if (
    parts.length === 0 ||
    parts.some(part => !/^\d+$/.test(part))
  ) {
    return null
  }

  const channels = [...new Set(parts.map(Number))].sort((a, b) => a - b)

  return channels.every(channel => channel >= 0 && channel <= 31)
    ? channels
    : null
}

function describeTotalChannels(device: ConfiguredDevice) {
  if (device.type === 'shelly-pro') {
    return 'All three phases'
  }

  const channels =
    device.totalChannels?.length > 0 ? device.totalChannels : [0]

  if (device.type === 'shelly-em') {
    return channels.map(channel => `Clamp ${channel + 1}`).join(' + ')
  }

  return `Channel${channels.length === 1 ? '' : 's'} ${channels.join(', ')}`
}

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

function EditIcon({ className = '' }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  )
}

function TrashIcon({ className = '' }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

export default function DevicesPage({ isDarkMode }: DevicesPageProps) {
  const [showSetup, setShowSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<1 | 2>(1)
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('shelly-em')
  const [deviceName, setDeviceName] = useState('Home energy monitor')
  const [deviceIdentifier, setDeviceIdentifier] = useState('')
  const [brokerUrl, setBrokerUrl] = useState('tcp://localhost:1883')
  const [mqttTopic, setMqttTopic] = useState('')
  const [mqttUsername, setMqttUsername] = useState('')
  const [mqttPassword, setMqttPassword] = useState('')
  const [totalChannels, setTotalChannels] = useState<number[]>([0])
  const [mqttTotalChannels, setMqttTotalChannels] = useState('0')
  const [devices, setDevices] = useState<ConfiguredDevice[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(() =>
    Boolean(localStorage.getItem('token'))
  )
  const [isSavingDevice, setIsSavingDevice] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null)
  const [devicePendingDeletion, setDevicePendingDeletion] =
    useState<ConfiguredDevice | null>(null)
  const [isDeletingDevice, setIsDeletingDevice] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const mutedTextClasses = isDarkMode ? 'text-slate-400' : 'text-slate-500'
  const panelClasses = isDarkMode
    ? 'border-white/10 bg-white/[0.04]'
    : 'border-slate-200 bg-white'
  const inputClasses = isDarkMode
    ? 'border-white/10 bg-slate-950 text-white placeholder:text-slate-600 focus:border-blue-500/70'
    : 'border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500'

  const openSetup = (device: DeviceType = 'shelly-em') => {
    setEditingDeviceId(null)
    setSelectedDevice(device)
    setDeviceName('Home energy monitor')
    setDeviceIdentifier('')
    setBrokerUrl('tcp://localhost:1883')
    setMqttTopic('')
    setMqttUsername('')
    setMqttPassword('')
    setTotalChannels([0])
    setMqttTotalChannels('0')
    setSetupStep(1)
    setSetupError(null)
    setShowSetup(true)
  }

  const openEditDevice = (device: ConfiguredDevice) => {
    setEditingDeviceId(device.id)
    setSelectedDevice(device.type)
    setDeviceName(device.name)
    setDeviceIdentifier(device.deviceIdentifier ?? '')
    setBrokerUrl(device.brokerUrl)
    setMqttTopic(device.topic)
    setMqttUsername(device.username ?? '')
    setMqttPassword('')
    setTotalChannels(
      device.totalChannels?.length > 0 ? device.totalChannels : [0]
    )
    setMqttTotalChannels(
      (device.totalChannels?.length > 0
        ? device.totalChannels
        : [0]
      ).join(', ')
    )
    setSetupStep(2)
    setSetupError(null)
    setShowSetup(true)
  }

  const closeSetup = () => {
    setShowSetup(false)
    setSetupError(null)
  }

  const selectDeviceType = (device: DeviceType) => {
    setSelectedDevice(device)
    setTotalChannels([0])
    setMqttTotalChannels('0')
  }

  const toggleTotalChannel = (channel: number) => {
    setTotalChannels(current =>
      current.includes(channel)
        ? current.filter(value => value !== channel)
        : [...current, channel].sort((a, b) => a - b)
    )
  }

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  const handleSaveDevice = async () => {
    setIsSavingDevice(true)
    setSetupError(null)

    try {
      const isEditing = editingDeviceId !== null
      const selectedTotalChannels =
        selectedDevice === 'mqtt'
          ? parseMqttChannels(mqttTotalChannels)
          : selectedDevice === 'shelly-pro'
            ? [0]
            : totalChannels

      if (!selectedTotalChannels || selectedTotalChannels.length === 0) {
        throw new Error('Select at least one channel for total consumption.')
      }

      const response = await fetch(
        isEditing ? `/api/devices/${editingDeviceId}` : '/api/devices',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: deviceName.trim(),
            type: selectedDevice,
            brokerUrl: selectedDevice === 'mqtt' ? brokerUrl.trim() : null,
            deviceIdentifier:
              selectedDevice === 'mqtt'
                ? null
                : deviceIdentifier.trim().toLowerCase(),
            topic: selectedDevice === 'mqtt' ? mqttTopic.trim() : null,
            username:
              selectedDevice === 'mqtt'
                ? isEditing
                  ? mqttUsername.trim()
                  : mqttUsername.trim() || null
                : null,
            password:
              selectedDevice === 'mqtt' && mqttPassword
                ? mqttPassword
                : null,
            totalChannels: selectedTotalChannels,
            enabled: true,
          }),
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(
          errorBody?.message ??
            errorBody?.detail ??
            `Could not ${isEditing ? 'update' : 'configure'} the device.`
        )
      }

      const savedDevice = (await response.json()) as ConfiguredDevice

      setDevices(current =>
        isEditing
          ? current.map(device =>
              device.id === savedDevice.id ? savedDevice : device
            )
          : [savedDevice, ...current]
      )

      setShowSetup(false)
      setEditingDeviceId(null)
      setDeviceIdentifier('')
      setMqttTopic('')
      setMqttPassword('')
    } catch (error) {
      setSetupError(
        error instanceof Error
          ? error.message
          : `Could not ${
              editingDeviceId !== null ? 'update' : 'configure'
            } the device.`
      )
    } finally {
      setIsSavingDevice(false)
    }
  }

  const handleDeleteDevice = async () => {
    if (!devicePendingDeletion) {
      return
    }

    setIsDeletingDevice(true)
    setDeleteError(null)

    try {
      const response = await fetch(
        `/api/devices/${devicePendingDeletion.id}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(
          errorBody?.message ??
            errorBody?.detail ??
            'Could not delete the device.'
        )
      }

      setDevices(current =>
        current.filter(device => device.id !== devicePendingDeletion.id)
      )
      setDevicePendingDeletion(null)
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : 'Could not delete the device.'
      )
    } finally {
      setIsDeletingDevice(false)
    }
  }

  const isShellyDevice = selectedDevice !== 'mqtt'
  const parsedMqttTotalChannels = parseMqttChannels(mqttTotalChannels)
  const hasTotalChannels =
    selectedDevice === 'shelly-pro' ||
    (selectedDevice === 'shelly-em'
      ? totalChannels.length > 0
      : parsedMqttTotalChannels !== null)
  const canConnect =
    deviceName.trim().length > 0 &&
    hasTotalChannels &&
    (isShellyDevice
      ? deviceIdentifier.trim().length > 0
      : brokerUrl.trim().length > 0 && mqttTopic.trim().length > 0)

  const connectedDevices = devices.filter(
    device => device.status === 'CONNECTED'
  ).length

  const deviceReadingTimestamps = devices
    .map(device => device.lastSeenAt)
    .filter((value): value is string => value !== null)
    .sort()

  const latestDeviceReading =
    deviceReadingTimestamps.length > 0
      ? deviceReadingTimestamps[deviceReadingTimestamps.length - 1]
      : undefined

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      return
    }

    let isActive = true

    const loadDevices = async () => {
      try {
        const response = await fetch('/api/devices', {
          headers: getAuthHeaders(),
        })

        if (!response.ok) {
          throw new Error('Could not load devices')
        }

        const data = (await response.json()) as ConfiguredDevice[]

        if (isActive) {
          setDevices(data)
        }
      } catch {
        // Keep the last known state if a background refresh fails.
      } finally {
        if (isActive) {
          setIsLoadingDevices(false)
        }
      }
    }

    void loadDevices()
    const refreshInterval = window.setInterval(loadDevices, 3000)

    return () => {
      isActive = false
      window.clearInterval(refreshInterval)
    }
  }, [])

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

            <h3 className="text-2xl font-bold">
              {devices.length === 0
                ? 'Connect your first device'
                : 'Manage your energy monitors'}
            </h3>
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
                <p className="mt-1 text-3xl font-bold">
                  {isLoadingDevices ? '—' : devices.length}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {devices.length === 0
                  ? 'No devices yet'
                  : `${connectedDevices} connected`}
              </span>
            </div>

            <div className={`my-5 h-px ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs uppercase tracking-wide ${mutedTextClasses}`}>
                  Data status
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {connectedDevices > 0
                    ? 'Receiving data'
                    : 'Waiting for device'}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wide ${mutedTextClasses}`}>
                  Last reading
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {latestDeviceReading
                    ? new Date(latestDeviceReading).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="mt-10">
          <div className="mb-5">
            <h3 className="text-xl font-bold">Configured devices</h3>
            <p className={`mt-1 text-sm ${mutedTextClasses}`}>
              Devices configured for your account are shown here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {devices.map(device => (
              <div
                key={device.id}
                className={`flex items-center gap-4 rounded-2xl border p-5 ${panelClasses}`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    isDarkMode
                      ? 'bg-blue-500/15 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {device.type === 'mqtt' ? (
                    <WifiIcon className="h-5 w-5" />
                  ) : (
                    <DeviceIcon className="h-5 w-5" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-semibold">{device.name}</h4>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        device.status === 'CONNECTED'
                          ? isDarkMode
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-emerald-50 text-emerald-700'
                          : device.status === 'ERROR'
                            ? isDarkMode
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-rose-50 text-rose-700'
                            : device.status === 'CONNECTING'
                              ? isDarkMode
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-amber-50 text-amber-700'
                            : isDarkMode
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {deviceStatusLabels[device.status]}
                    </span>
                  </div>

                  <p className={`mt-1 truncate text-sm ${mutedTextClasses}`}>
                    {device.deviceIdentifier ?? device.topic}
                  </p>
                  <p className={`mt-1 text-xs ${mutedTextClasses}`}>
                    Home total: {describeTotalChannels(device)}
                  </p>

                  {device.lastError && (
                    <p
                      className={`mt-2 text-xs ${
                        isDarkMode ? 'text-rose-300' : 'text-rose-600'
                      }`}
                    >
                      {device.lastError}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditDevice(device)}
                    aria-label={`Edit ${device.name}`}
                    title="Edit device"
                    className={`cursor-pointer rounded-lg p-2 transition ${
                      isDarkMode
                        ? 'text-slate-400 hover:bg-white/10 hover:text-white'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDevicePendingDeletion(device)
                    }}
                    aria-label={`Delete ${device.name}`}
                    title="Delete device"
                    className={`cursor-pointer rounded-lg p-2 transition ${
                      isDarkMode
                        ? 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-300'
                        : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              description:
                'Enter the Shelly device identifier or your MQTT source details.',
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
                    {editingDeviceId !== null
                      ? 'Edit device'
                      : `Step ${setupStep} of 2`}
                  </p>
                  <h3 id="device-setup-title" className="mt-1 text-xl font-bold">
                    {editingDeviceId !== null
                      ? 'Update device details'
                      : setupStep === 1
                        ? 'Choose a device'
                        : 'Device details'}
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
                            onClick={() => selectDeviceType(device.id)}
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
                            {isShellyDevice
                              ? 'Shelly MQTT connection'
                              : 'Custom MQTT connection'}
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

                        {isShellyDevice && (
                          <label className="block">
                            <span className="mb-2 block text-sm font-semibold">
                              Device identifier
                            </span>
                            <input
                              type="text"
                              value={deviceIdentifier}
                              onChange={event =>
                                setDeviceIdentifier(event.target.value)
                              }
                              placeholder={
                                selectedDevice === 'shelly-em'
                                  ? 'e.g. shellyemg3-e4b323227cfc'
                                  : 'e.g. shellypro3em-e4b323227cfc'
                              }
                              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                            />
                          </label>
                        )}

                        {!isShellyDevice && (
                          <>
                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold">
                                MQTT broker URL
                              </span>
                              <input
                                type="text"
                                value={brokerUrl}
                                onChange={event => setBrokerUrl(event.target.value)}
                                placeholder="e.g. tcp://localhost:1883"
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold">
                                MQTT topic
                              </span>
                              <input
                                type="text"
                                value={mqttTopic}
                                onChange={event => setMqttTopic(event.target.value)}
                                placeholder="e.g. home/energy/#"
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold">
                                Username <span className={mutedTextClasses}>(optional)</span>
                              </span>
                              <input
                                type="text"
                                autoComplete="username"
                                value={mqttUsername}
                                onChange={event =>
                                  setMqttUsername(event.target.value)
                                }
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                              />
                            </label>

                            <label className="block">
                              <span className="mb-2 block text-sm font-semibold">
                                Password <span className={mutedTextClasses}>(optional)</span>
                              </span>
                              <input
                                type="password"
                                autoComplete="new-password"
                                value={mqttPassword}
                                onChange={event =>
                                  setMqttPassword(event.target.value)
                                }
                                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                              />
                              {editingDeviceId !== null && (
                                <span
                                  className={`mt-2 block text-xs ${mutedTextClasses}`}
                                >
                                  Leave blank to keep the current password.
                                </span>
                              )}
                            </label>
                          </>
                        )}
                      </div>

                      <div
                        className={`mt-5 rounded-2xl border p-4 ${panelClasses}`}
                      >
                        <p className="text-sm font-semibold">
                          Home total consumption
                        </p>
                        <p className={`mt-1 text-sm ${mutedTextClasses}`}>
                          Only the selected measurements will be combined and
                          stored as the home total.
                        </p>

                        {selectedDevice === 'shelly-em' && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {[0, 1].map(channel => {
                              const isSelected =
                                totalChannels.includes(channel)

                              return (
                                <button
                                  key={channel}
                                  type="button"
                                  onClick={() => toggleTotalChannel(channel)}
                                  className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                                    isSelected
                                      ? isDarkMode
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                                        : 'border-blue-500 bg-blue-50 text-blue-800'
                                      : isDarkMode
                                        ? 'border-white/10 hover:bg-white/5'
                                        : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>
                                    <span className="block font-semibold">
                                      Clamp {channel + 1}
                                    </span>
                                    <span
                                      className={`mt-0.5 block text-xs ${mutedTextClasses}`}
                                    >
                                      MQTT channel {channel}
                                    </span>
                                  </span>

                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-500 text-white'
                                        : isDarkMode
                                          ? 'border-white/20'
                                          : 'border-slate-300'
                                    }`}
                                  >
                                    {isSelected && (
                                      <CheckIcon className="h-3 w-3" />
                                    )}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {selectedDevice === 'shelly-pro' && (
                          <div
                            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                              isDarkMode
                                ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
                                : 'border-blue-200 bg-blue-50 text-blue-800'
                            }`}
                          >
                            All three phases will be combined automatically.
                          </div>
                        )}

                        {selectedDevice === 'mqtt' && (
                          <label className="mt-4 block">
                            <span className="mb-2 block text-sm font-semibold">
                              Channels included in total
                            </span>
                            <input
                              type="text"
                              value={mqttTotalChannels}
                              onChange={event =>
                                setMqttTotalChannels(event.target.value)
                              }
                              placeholder="e.g. 0, 1"
                              className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition ${inputClasses}`}
                            />
                            <span
                              className={`mt-2 block text-xs ${mutedTextClasses}`}
                            >
                              Separate channel IDs with commas. Values from 0
                              to 31 are supported.
                            </span>
                          </label>
                        )}
                      </div>

                      <div
                        className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
                          setupError
                            ? isDarkMode
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                              : 'border-rose-200 bg-rose-50 text-rose-800'
                            : isDarkMode
                              ? 'border-blue-500/20 bg-blue-500/10 text-blue-200'
                              : 'border-blue-200 bg-blue-50 text-blue-800'
                        }`}
                      >
                        {setupError ??
                          (isShellyDevice
                            ? `Volt will subscribe to ${
                                deviceIdentifier.trim().toLowerCase() ||
                                'your-device-identifier'
                              }/# using the server's configured MQTT broker.`
                            : 'Volt will connect to this broker and subscribe to the supplied topic.')}
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
                {setupStep === 1 || editingDeviceId !== null ? (
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
                    disabled={!canConnect || isSavingDevice}
                    onClick={handleSaveDevice}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                      canConnect && !isSavingDevice
                        ? 'cursor-pointer bg-blue-600 hover:bg-blue-500'
                        : 'cursor-not-allowed bg-blue-600/50 text-white/70'
                    }`}
                  >
                    {isSavingDevice
                      ? editingDeviceId !== null
                        ? 'Updating...'
                        : 'Connecting...'
                      : editingDeviceId !== null
                        ? 'Update device'
                        : 'Verify & connect'}
                  </button>
                )}
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {devicePendingDeletion && (
          <>
            <motion.button
              type="button"
              aria-label="Close delete confirmation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              disabled={isDeletingDevice}
              onClick={() => setDevicePendingDeletion(null)}
              className="fixed inset-0 z-[80] cursor-default bg-black/60 backdrop-blur-sm"
            />

            <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-4">
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-device-title"
                aria-describedby="delete-device-description"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className={`pointer-events-auto w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
                  isDarkMode
                    ? 'border-white/10 bg-slate-950'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isDarkMode
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <TrashIcon className="h-5 w-5" />
                </div>

                <h3 id="delete-device-title" className="mt-5 text-xl font-bold">
                  Delete device?
                </h3>
                <p
                  id="delete-device-description"
                  className={`mt-2 leading-6 ${mutedTextClasses}`}
                >
                  <span className="font-semibold">
                    {devicePendingDeletion.name}
                  </span>{' '}
                  will be removed from your account. This action cannot be
                  undone.
                </p>

                {deleteError && (
                  <p
                    className={`mt-4 rounded-xl border p-3 text-sm ${
                      isDarkMode
                        ? 'border-rose-500/20 bg-rose-500/10 text-rose-200'
                        : 'border-rose-200 bg-rose-50 text-rose-800'
                    }`}
                  >
                    {deleteError}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isDeletingDevice}
                    onClick={() => setDevicePendingDeletion(null)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isDeletingDevice
                        ? 'cursor-not-allowed opacity-50'
                        : isDarkMode
                          ? 'cursor-pointer hover:bg-white/10'
                          : 'cursor-pointer hover:bg-slate-100'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingDevice}
                    onClick={handleDeleteDevice}
                    className={`rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition ${
                      isDeletingDevice
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-rose-500'
                    }`}
                  >
                    {isDeletingDevice ? 'Deleting...' : 'Delete device'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  )
}
