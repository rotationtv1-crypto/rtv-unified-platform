import { Tv, Radio, PlaySquare, UserCog, Shield } from 'lucide-react'
import { useRTVStore } from '../store/rtvStore'

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: 'channels' | 'live' | 'vod' | 'creator' | 'admin') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { user } = useRTVStore()

  const tabs = [
    { id: 'channels' as const, label: 'Channels', icon: Tv },
    { id: 'live' as const, label: 'Live', icon: Radio },
    { id: 'vod' as const, label: 'VOD', icon: PlaySquare },
    { id: 'creator' as const, label: 'Studio', icon: UserCog },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-md border-t border-gray-800/50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
                isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          )
        })}
        {user?.isAdmin && (
          <button
            onClick={() => onTabChange('admin')}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${
              activeTab === 'admin' ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}
