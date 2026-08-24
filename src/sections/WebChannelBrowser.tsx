import { useState } from 'react'
import { Radio, Search, Filter, Play } from 'lucide-react'
import { useRTVStore } from '../store/rtvStore'

const channels = [
  { id: 'rtv-main', name: 'RTV Main', description: '24/7 streaming television', category: 'General', viewers: 2847 },
  { id: 'rtv-news', name: 'RTV News 24', description: 'Breaking news & coverage', category: 'News', viewers: 1523 },
  { id: 'rtv-sports', name: 'RTV Sports', description: 'Live sports & analysis', category: 'Sports', viewers: 3421 },
  { id: 'rtv-movies', name: 'RTV Cinema', description: 'Movies & entertainment', category: 'Movies', viewers: 1890 },
  { id: 'rtv-kids', name: 'RTV Kids', description: 'Family-friendly content', category: 'Kids', viewers: 934 },
  { id: 'rtv-tech', name: 'RTV Tech', description: 'Innovation & gaming', category: 'Tech', viewers: 1567 },
]

export function WebChannelBrowser() {
  const [search, setSearch] = useState('')
  const { setCurrentChannel } = useRTVStore()

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" />
            Channels
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} channels available</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((channel) => (
          <div
            key={channel.id}
            className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer group"
            onClick={() => setCurrentChannel({
              id: channel.id,
              slug: channel.id,
              name: channel.name,
              description: channel.description,
              category: channel.category,
              isLive: true,
              viewerCount: channel.viewers,
            })}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center flex-shrink-0">
                <Radio className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{channel.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{channel.description}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-xs text-gray-500">{channel.viewers.toLocaleString()} watching</span>
                </div>
              </div>
              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Play className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
