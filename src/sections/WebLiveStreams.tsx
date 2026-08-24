import { useState } from 'react'
import { Radio, Users, Play } from 'lucide-react'
import { LivePlayer } from './LivePlayer'
import { useRTVStore } from '../store/rtvStore'

const streams = [
  { id: 'rtv-main', title: 'RTV Main', description: '24/7 streaming television', category: 'General', viewers: 2847 },
  { id: 'rtv-news', title: 'RTV News 24', description: 'Breaking news & coverage', category: 'News', viewers: 1523 },
  { id: 'rtv-sports', title: 'RTV Sports', description: 'Live sports & analysis', category: 'Sports', viewers: 3421 },
  { id: 'rtv-movies', title: 'RTV Cinema', description: 'Movies & entertainment', category: 'Movies', viewers: 1890 },
  { id: 'rtv-kids', title: 'RTV Kids', description: 'Family-friendly content', category: 'Kids', viewers: 934 },
  { id: 'rtv-tech', title: 'RTV Tech', description: 'Innovation & gaming', category: 'Tech', viewers: 1567 },
]

export function WebLiveStreams() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" />
            Live Streams
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{streams.length} channels broadcasting now</p>
        </div>
      </div>

      {selectedStream ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedStream(null)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to all streams
          </button>
          <div className="aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
            <LivePlayer channelId={selectedStream} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {streams.map((stream) => (
            <div
              key={stream.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all cursor-pointer group"
              onClick={() => handleWatch(stream)}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                  <Radio className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{stream.title}</h3>
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{stream.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" />
                      {stream.viewers.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">{stream.category}</span>
                  </div>
                </div>
                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
