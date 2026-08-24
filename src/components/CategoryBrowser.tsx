import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid3X3, List, Filter, Star, Play, Info, ChevronRight } from 'lucide-react'
import { categories, featuredShows, genreColors } from '../data/lineupData'
import { useRTVStore } from '../store/rtvStore'
import type { Show, Genre } from '../types/lineup'

export function CategoryBrowser() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<Set<Genre>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const { setCurrentChannel } = useRTVStore()

  const allGenres = useMemo(() => {
    const set = new Set<Genre>()
    categories.forEach((c) => c.genres.forEach((g) => set.add(g)))
    return Array.from(set).sort()
  }, [])

  const filteredShows = useMemo(() => {
    return featuredShows.filter((show) => {
      const matchesCategory = !selectedCategory || show.genres.some((g) => {
        const cat = categories.find((c) => c.id === selectedCategory)
        return cat?.genres.includes(g)
      })
      const matchesGenre = selectedGenres.size === 0 || show.genres.some((g) => selectedGenres.has(g))
      const matchesSearch = !searchQuery || show.title.toLowerCase().includes(searchQuery.toLowerCase()) || show.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesGenre && matchesSearch
    })
  }, [selectedCategory, selectedGenres, searchQuery])

  const toggleGenre = (genre: Genre) => {
    const next = new Set(selectedGenres)
    if (next.has(genre)) next.delete(genre)
    else next.add(genre)
    setSelectedGenres(next)
  }

  const handleWatch = (show: Show) => {
    setCurrentChannel({
      id: show.id,
      slug: show.id,
      name: show.title,
      description: show.description,
      category: show.genres[0] || 'General',
      isLive: show.type === 'live',
    })
    navigate('/watch/' + show.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Browse</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filteredShows.length} titles</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search shows, movies, genres..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-600"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5`}
            style={{
              backgroundColor: selectedCategory === cat.id ? cat.color + '30' : undefined,
              color: selectedCategory === cat.id ? cat.color : undefined,
              ...(selectedCategory !== cat.id ? { backgroundColor: 'rgba(31,41,55,0.5)', color: '#9ca3af' } : {}),
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
            {cat.name}
          </button>
        ))}
      </div>

      {/* Genre Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {allGenres.slice(0, 20).map((genre) => (
            <button
              key={genre}
              onClick={() => toggleGenre(genre)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                selectedGenres.has(genre)
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-gray-700/50 bg-gray-800/30 text-gray-500 hover:text-gray-300'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Shows Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredShows.map((show) => (
            <div
              key={show.id}
              className="group bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all cursor-pointer"
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
                {show.type === 'live' && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-red-600/90 text-white text-[10px] font-bold rounded">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                  {show.rating}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{show.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{show.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {show.genres.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${genreColors[g] || '#6366f1'}15`,
                        color: genreColors[g] || '#6366f1',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShows.map((show) => (
            <div
              key={show.id}
              className="flex gap-4 bg-gray-900/50 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors cursor-pointer"
              onClick={() => handleWatch(show)}
            >
              <div className="w-24 h-16 sm:w-32 sm:h-20 rounded-lg bg-gray-800 flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
                {show.type === 'live' && (
                  <span className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-red-600/90 text-white text-[9px] font-bold rounded">
                    <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm">{show.title}</h3>
                  {show.isOriginal && (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{show.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {show.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        backgroundColor: `${genreColors[g] || '#6366f1'}15`,
                        color: genreColors[g] || '#6366f1',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                  <span className="text-[10px] text-gray-600 ml-auto">{show.rating}</span>
                </div>
              </div>
              <div className="flex items-center self-center">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredShows.length === 0 && (
        <div className="text-center py-12">
          <Info className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">No shows match your filters</p>
          <button
            onClick={() => { setSelectedCategory(null); setSelectedGenres(new Set()); setSearchQuery('') }}
            className="text-blue-400 text-sm mt-2 hover:text-blue-300"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
