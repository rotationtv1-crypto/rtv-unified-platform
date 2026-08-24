import { useRTVStore } from './store/rtvStore'
import { useTelegramAuth } from './hooks/useTelegramAuth'
import { ChannelGrid } from './sections/ChannelGrid'
import { LivePlayer } from './sections/LivePlayer'
import { VODLibrary } from './sections/VODLibrary'
import { CreatorDashboard } from './sections/CreatorDashboard'
import { AdminPanel } from './sections/AdminPanel'
import { BottomNav } from './sections/BottomNav'
import { Tv } from 'lucide-react'

function App() {
  const { activeTab, setActiveTab, isLoading, user } = useRTVStore()
  const { isReady, error } = useTelegramAuth()

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Initializing RotationTV...</p>
        </div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 max-w-sm w-full text-center">
          <Tv className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">RotationTV</h1>
          <p className="text-gray-400 text-sm mb-4">Open in Telegram for the full experience</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-20">
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-sm tracking-wide">ROTATIONTV</span>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                <span className="text-yellow-400 text-xs">⭐</span>
                <span className="text-yellow-400 text-xs font-medium">{user.balanceStars}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {activeTab === 'channels' && <ChannelGrid />}
        {activeTab === 'live' && <LivePlayer />}
        {activeTab === 'vod' && <VODLibrary />}
        {activeTab === 'creator' && <CreatorDashboard />}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default App
