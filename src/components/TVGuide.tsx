import { useState, useRef, useEffect, useMemo } from 'react'
import { Clock, Calendar, ChevronLeft, ChevronRight, Radio, Play } from 'lucide-react'
import { channelLineups, genreColors } from '../data/lineupData'
import type { Program } from '../types/lineup'

const HOUR_WIDTH = 120 // pixels per hour
const CHANNEL_HEIGHT = 80
const START_HOUR = 0
const END_HOUR = 24
const TOTAL_HOURS = END_HOUR - START_HOUR

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getProgramStyle(p: Program) {
  const start = new Date(p.startTime)
  const end = new Date(p.endTime)
  const startHour = start.getHours() + start.getMinutes() / 60
  const endHour = end.getHours() + end.getMinutes() / 60
  const left = (startHour - START_HOUR) * HOUR_WIDTH
  const width = (endHour - startHour) * HOUR_WIDTH
  return { left, width: Math.max(width, 60) }
}

export function TVGuide() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [nowHour] = useState(() => new Date().getHours() + new Date().getMinutes() / 60)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      const scrollLeft = (nowHour - START_HOUR) * HOUR_WIDTH - 100
      scrollRef.current.scrollLeft = Math.max(0, scrollLeft)
    }
  }, [nowHour])

  const timeLabels = useMemo(() => {
    const labels = []
    for (let h = START_HOUR; h < END_HOUR; h++) {
      const period = h >= 12 ? 'PM' : 'AM'
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
      labels.push({ hour: h, label: `${hour12} ${period}` })
    }
    return labels
  }, [])

  const currentTimeLeft = (nowHour - START_HOUR) * HOUR_WIDTH

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            TV Guide
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {channelLineups.length} channels • {selectedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().slice(0, 10))
            }}
            className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().slice(0, 10))
            }}
            className="p-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EPG Grid */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        {/* Time Header */}
        <div className="flex border-b border-gray-800 overflow-hidden">
          <div className="w-40 sm:w-48 flex-shrink-0 p-3 border-r border-gray-800 bg-gray-900/80">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Channels</span>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div className="relative" style={{ width: TOTAL_HOURS * HOUR_WIDTH }}>
              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                style={{ left: currentTimeLeft }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
              </div>
              {/* Hour labels */}
              <div className="flex h-10">
                {timeLabels.map((t) => (
                  <div
                    key={t.hour}
                    className="flex-shrink-0 border-r border-gray-800/50 px-2 flex items-center"
                    style={{ width: HOUR_WIDTH }}
                  >
                    <span className="text-xs text-gray-500">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Channel Rows */}
        <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
          {channelLineups.map((ch) => (
            <div key={ch.channelId} className="flex border-b border-gray-800/50 last:border-0">
              {/* Channel Info */}
              <div className="w-40 sm:w-48 flex-shrink-0 p-3 border-r border-gray-800 bg-gray-900/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ch.channelName}</p>
                  <p className="text-xs text-gray-500">{ch.programs.length} shows</p>
                </div>
              </div>

              {/* Programs */}
              <div className="flex-1 overflow-x-auto scrollbar-hide">
                <div className="relative" style={{ width: TOTAL_HOURS * HOUR_WIDTH, height: CHANNEL_HEIGHT }}>
                  {/* Hour grid lines */}
                  {timeLabels.map((t) => (
                    <div
                      key={t.hour}
                      className="absolute top-0 bottom-0 border-r border-gray-800/30"
                      style={{ left: (t.hour - START_HOUR) * HOUR_WIDTH }}
                    />
                  ))}

                  {/* Programs */}
                  {ch.programs.map((p) => {
                    const style = getProgramStyle(p)
                    const genre = p.genre[0] || 'General'
                    const color = genreColors[genre] || '#6366f1'
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProgram(p)}
                        className="absolute top-2 bottom-2 rounded-lg px-2 py-1 text-left transition-all hover:brightness-110 hover:scale-[1.02] cursor-pointer overflow-hidden"
                        style={{
                          left: style.left + 2,
                          width: style.width - 4,
                          backgroundColor: `${color}18`,
                          borderLeft: `3px solid ${color}`,
                        }}
                        title={`${p.title} (${formatTime(p.startTime)} - ${formatTime(p.endTime)})`}
                      >
                        <p className="text-xs font-medium truncate" style={{ color }}>
                          {p.title}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {formatTime(p.startTime)} - {formatTime(p.endTime)}
                        </p>
                        {p.isLive && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-400 mt-0.5">
                            <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Program Detail Modal */}
      {selectedProgram && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedProgram(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold">{selectedProgram.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedProgram.startTime)} - {formatTime(selectedProgram.endTime)}
                </div>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            {selectedProgram.description && (
              <p className="text-sm text-gray-400 mb-4">{selectedProgram.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedProgram.genre.map((g) => (
                <span
                  key={g}
                  className="px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: `${genreColors[g] || '#6366f1'}20`,
                    color: genreColors[g] || '#6366f1',
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                <Play className="w-4 h-4" />
                Watch Now
              </button>
              {selectedProgram.isPremiere && (
                <span className="px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 text-xs font-medium border border-yellow-500/20">
                  Premiere
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
