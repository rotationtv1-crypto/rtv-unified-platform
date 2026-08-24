import { Film, Play, Clock, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { featuredShows } from '../data/lineupData'
import { useRTVStore } from '../store/rtvStore'

export function WebVOD() {
  const navigate = useNavigate()
  const { setCurrentChannel } = useRTVStore()

  const handleWatch = (show: typeof featuredShows[0]) => {
    setCurrentChannel({
      id: show.id,
      slug: show.id,
      name: show.title,
      description: show.description,
      category: show.genres[0] || 'General',
      isLive: false,
    })
    navigate('/watch/' + show.id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Film className="w-5 h-5 text-purple-400" />
          VOD Library
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">{featuredShows.length} titles available</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {featuredShows.map((show) => (
          <div
            key={show.id}
            className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all cursor-pointer group"
            onClick={() => handleWatch(show)}
          >
            <div className="aspect-video bg-gray-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="w-12 h-12 rounded-full bg-blue-600/90 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-0.5" />
                </div>
              </div>
              {show.isOriginal && (
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500/90 text-black text-[10px] font-bold rounded">
                  ORIGINAL
                </span>
              )}
              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {show.duration || '45m'}
              </span>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm">{show.title}</h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{show.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">{show.year}</span>
                <span className="text-xs text-gray-600">{show.rating}</span>
                {show.seasons && (
                  <span className="text-xs text-gray-500">{show.seasons} seasons</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
