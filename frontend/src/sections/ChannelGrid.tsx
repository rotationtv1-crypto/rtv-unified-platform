import { useEffect, useState } from 'react'
import { useRTVStore } from '../store/rtvStore'
import { Play, Eye, Radio } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rotationtv-api.rotationtimmy.workers.dev'

const categories = ['All', 'news', 'movies', 'music', 'sports', 'gaming', 'culture', 'live', 'creator']

export function ChannelGrid() {
  const { channels, setChannels, setCurrentChannel, setActiveTab } = useRTVStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/channels`)
      .then((res) => res.json())
      .then((data) => {
        setChannels(data.channels || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [setChannels])

  const filtered = selectedCategory === 'All'
    ? channels
    : channels.filter((c) => c.category === selectedCategory)

  const liveCount = channels.filter((c) => c.isLive).length

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Radio className="w-3 h-3 text-red-500 animate-pulse" />
          <span>{liveCount} LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span>{channels.reduce((a, c) => a + c.viewerCount, 0).toLocaleString()} watching</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((channel) => (
            <button
              key={channel.id}
              onClick={() => {
                setCurrentChannel(channel)
                setActiveTab('live')
              }}
              className="relative bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden group active:scale-95 transition-transform"
            >
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative">
                {channel.logoUrl && (
                  <img
                    src={channel.logoUrl}
                    alt={channel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                )}
                {channel.isLive && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600/90 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    LIVE
                  </div>
                )}
                {channel.isFast && (
                  <div className="absolute top-2 right-2 bg-blue-600/90 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    FAST
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="p-2.5 text-left">
                <h3 className="text-xs font-semibold text-white truncate">{channel.name}</h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{channel.description}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                    <Eye className="w-3 h-3" />
                    {channel.viewerCount.toLocaleString()}
                  </span>
                  {channel.currentProgram && (
                    <span className="text-[10px] text-blue-400 truncate">{channel.currentProgram}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
