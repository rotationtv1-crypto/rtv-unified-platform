import { useState } from 'react'
import { Radio, Users, Eye, Play } from 'lucide-react'
import { LivePlayer } from './LivePlayer'
import { useRTVStore } from '../store/rtvStore'

const streams = [
  {
    id: 'rtv-main',
    title: 'RTV Main',
    description: '24/7 streaming television',
    category: 'General',
    viewers: 2847,
    isLive: true,
  },
  {
    id: 'rtv-news',
    title: 'RTV News 24',
    description: 'Breaking news & coverage',
    category: 'News',
    viewers: 1523,
    isLive: true,
  },
  {
    id: 'rtv-sports',
    title: 'RTV Sports',
    description: 'Live sports & analysis',
    category: 'Sports',
    viewers: 3421,
    isLive: true,
  },
  {
    id: 'rtv-movies',
    title: 'RTV Cinema',
    description: 'Movies & entertainment',
    category: 'Movies',
    viewers: 1890,
    isLive: true,
  },
]

export function LiveStreams() {
  const [selectedStream, setSelectedStream] = useState<string | null>(null)
  const { setCurrentChannel } = useRTVStore()

  const handleWatch = (stream: typeof streams[0]) => {
    setCurrentChannel({
      id: stream.id,
      slug: stream.id,
      name: stream.title,
      description: stream.description,
      category: stream.category,
      isLive: true,
      viewerCount: stream.viewers,
    })
    setSelectedStream(stream.id)
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Radio className="w-5 h-5 text-red-400" />
        Live Streams
      </h2>

      {selectedStream ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedStream(null)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to streams
          </button>
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
            <LivePlayer channelId={selectedStream} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
              onClick={() => handleWatch(stream)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-blue-400" />
                </div>
                <span className="flex items-center gap-1 px-2 py-1 bg-red-600/20 text-red-400 text-xs font-medium rounded">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
              <h3 className="font-medium">{stream.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{stream.description}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {stream.viewers.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500">{stream.category}</span>
              </div>
              <button className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors text-sm font-medium">
                <Play className="w-4 h-4" />
                Watch Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
