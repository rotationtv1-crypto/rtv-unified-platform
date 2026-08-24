import { useState, useEffect } from 'react'
import { Play, TrendingUp, Clock, Flame, Radio, Users } from 'lucide-react'
import { useRTVStore } from '../store/rtvStore'
import { LivePlayer } from './LivePlayer'

const nowPlaying = {
  title: 'RTV Main Channel',
  description: '24/7 streaming television - Live now',
  viewerCount: 2847,
  isLive: true,
  category: 'General',
}

const trendingStreams = [
  { id: '1', title: 'Crypto Daily Live', viewers: 1240, category: 'Finance', isLive: true },
  { id: '2', title: 'Indie Spotlight', viewers: 856, category: 'Movies', isLive: true },
  { id: '3', title: 'Fight Night', viewers: 3421, category: 'Sports', isLive: true },
  { id: '4', title: 'World Kitchen', viewers: 623, category: 'Food', isLive: true },
]

const upcomingEvents = [
  { id: 'e1', title: 'Formula 1 Grand Prix', time: 'Tomorrow, 14:00 UTC', category: 'Sports' },
  { id: 'e2', title: 'UFC Championship', time: 'Sat, 20:00 UTC', category: 'Sports' },
  { id: 'e3', title: 'Tech Summit 2024', time: 'Sun, 10:00 UTC', category: 'Tech' },
]

export function LandingPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const { currentChannel } = useRTVStore()

  useEffect(() => {
    if (currentChannel) setIsPlaying(true)
  }, [currentChannel])

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative rounded-2xl overflow-hidden bg-gray-900/50 border border-gray-800">
        <div className="aspect-video max-h-[500px]">
          {isPlaying ? (
            <LivePlayer channelId={currentChannel?.id || 'rtv-main'} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50">
              <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 cursor-pointer hover:bg-blue-600/30 transition-colors"
                onClick={() => setIsPlaying(true)}>
                <Play className="w-8 h-8 text-blue-400 ml-1" />
              </div>
              <h2 className="text-xl font-bold">{nowPlaying.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{nowPlaying.description}</p>
              <div className="flex items-center gap-4 mt-4">
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Users className="w-4 h-4" />
                  {nowPlaying.viewerCount.toLocaleString()} watching
                </span>
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trending Now */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-bold">Trending Now</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trendingStreams.map((stream) => (
            <div
              key={stream.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-blue-400" />
                </div>
                {stream.isLive && (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <h3 className="font-medium text-sm">{stream.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{stream.category}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                <Users className="w-3 h-3" />
                {stream.viewers.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold">Upcoming Events</h2>
        </div>
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-4 bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm">{event.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{event.time}</p>
              </div>
              <span className="px-2 py-1 rounded-md bg-gray-800 text-xs text-gray-400">
                {event.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Channels', value: '50+', icon: Radio },
          { label: 'Live Viewers', value: '12.4K', icon: Users },
          { label: 'VOD Titles', value: '2,400+', icon: Play },
          { label: 'Countries', value: '80+', icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <stat.icon className="w-5 h-5 text-gray-500 mx-auto mb-2" />
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
