import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Radio, Film, Share2, Heart } from 'lucide-react'
import { LivePlayer } from './LivePlayer'
import { useRTVStore } from '../store/rtvStore'
import { featuredShows } from '../data/lineupData'

export function WebWatch() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentChannel, setCurrentChannel } = useRTVStore()

  const show = featuredShows.find((s) => s.id === id)

  useEffect(() => {
    if (show && !currentChannel) {
      setCurrentChannel({
        id: show.id,
        slug: show.id,
        name: show.title,
        description: show.description,
        category: show.genres[0] || 'General',
        isLive: show.type === 'live',
      })
    }
  }, [show, currentChannel, setCurrentChannel])

  if (!show && !currentChannel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Content not found</p>
        <button
          onClick={() => navigate('/')}
          className="text-blue-400 text-sm mt-2 hover:text-blue-300"
        >
          Go Home
        </button>
      </div>
    )
  }

  const title = currentChannel?.name || show?.title || 'Unknown'
  const description = currentChannel?.description || show?.description || ''
  const isLive = currentChannel?.isLive || show?.type === 'live'
  const genres = show?.genres || []
  const rating = show?.rating
  const year = show?.year
  const seasons = show?.seasons

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Player */}
      <div className="aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
        <LivePlayer channelId={currentChannel?.id || id || 'rtv-main'} />
      </div>

      {/* Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 text-red-400 text-xs font-medium rounded">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  LIVE
                </span>
              )}
              {show?.isOriginal && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
                  ORIGINAL
                </span>
              )}
              {rating && (
                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded">
                  {rating}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-gray-400 mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400">
              <Heart className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {year && <span>{year}</span>}
          {seasons && <span>{seasons} seasons</span>}
          {genres.length > 0 && (
            <div className="flex items-center gap-2">
              {genres.map((g) => (
                <span key={g} className="px-2 py-0.5 bg-gray-800 rounded text-xs">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Related Content */}
        {show && (
          <div className="pt-6 border-t border-gray-800">
            <h3 className="font-medium mb-4">More Like This</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {featuredShows
                .filter((s) => s.id !== show.id && s.genres.some((g) => show.genres.includes(g)))
                .slice(0, 4)
                .map((related) => (
                  <div
                    key={related.id}
                    className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate('/watch/' + related.id)}
                  >
                    <div className="aspect-video bg-gray-800 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                      {related.isOriginal && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-yellow-500/90 text-black text-[9px] font-bold rounded">
                          ORIGINAL
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-sm font-medium truncate">{related.title}</p>
                      <p className="text-xs text-gray-500">{related.year}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
