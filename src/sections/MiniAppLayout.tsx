import { useState } from 'react'
import { Tv, Radio, Film, Zap, User, Settings } from 'lucide-react'
import { LiveStreams } from './LiveStreams'
import { LandingPage } from './LandingPage'

type Tab = 'home' | 'channels' | 'live' | 'vod' | 'profile'

const tabs: { id: Tab; label: string; icon: typeof Tv }[] = [
  { id: 'home', label: 'Home', icon: Tv },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'live', label: 'Live', icon: Zap },
  { id: 'vod', label: 'VOD', icon: Film },
  { id: 'profile', label: 'Profile', icon: User },
]

export function MiniAppLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">RTV</span>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-800">
          <Settings className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 'home' && <LandingPage />}
        {activeTab === 'channels' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">Channels</h2>
            <p className="text-sm text-gray-500">Channel browser coming soon...</p>
          </div>
        )}
        {activeTab === 'live' && <LiveStreams />}
        {activeTab === 'vod' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">VOD Library</h2>
            <p className="text-sm text-gray-500">Video on demand coming soon...</p>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-bold">Profile</h2>
            <p className="text-sm text-gray-500">Profile settings coming soon...</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="flex items-center justify-around px-2 py-2 border-t border-gray-800 bg-[#0a0a0f]/95 backdrop-blur safe-area-pb">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
