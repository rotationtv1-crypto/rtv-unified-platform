import { useEffect, useState } from 'react'
import { useRTVStore } from '../store/rtvStore'
import { Play, Clock, Eye, Search } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://rotationtv-api.rotationtimmy.workers.dev'

const categories = ['All', 'movies', 'animation', 'documentary', 'music', 'gaming', 'culture']

export function VODLibrary() {
  const { vodItems, setVodItems } = useRTVStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/vod`)
      .then((res) => res.json())
      .then((data) => {
        setVodItems(data.items || [])
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [setVodItems])

  const filtered = vodItems.filter((item) => {
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory
    const matchSearch = !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden group active:scale-[0.98] transition-transform"
            >
              <div className="relative w-32 shrink-0 aspect-video bg-gradient-to-br from-gray-800 to-gray-900">
                {item.thumbnailUrl && (
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Play className="w-6 h-6 text-white" />
                </div>
                <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[10px] flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {formatDuration(item.durationSeconds)}
                </div>
              </div>

              <div className="py-2 pr-3 flex flex-col justify-center min-w-0">
                <h3 className="text-xs font-semibold text-white truncate">{item.title}</h3>
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.creatorName}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                    <Eye className="w-3 h-3" />
                    {item.viewCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500">{item.category}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
