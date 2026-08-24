import { useRTVStore } from '../store/rtvStore'
import { DollarSign, Users, Star, TrendingUp, Video, Gift, ArrowUpRight } from 'lucide-react'

export function CreatorDashboard() {
  const { user } = useRTVStore()

  if (!user?.isCreator) {
    return (
      <div className="p-4">
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-6 text-center">
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Creator Studio</h2>
          <p className="text-sm text-gray-400 mb-4">Apply to become a RotationTV creator and start earning</p>
          <button
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Apply Now
          </button>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Earnings (USD)', value: '$1,247.50', icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Total Stars', value: '95,420', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Subscribers', value: '12.4K', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Watch Time', value: '847h', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ]

  const recentTips = [
    { user: 'AlexM', gift: '🚀', amount: 10, time: '2m ago' },
    { user: 'StreamFan99', gift: '💎', amount: 100, time: '15m ago' },
    { user: 'CryptoQueen', gift: '👑', amount: 50, time: '1h ago' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">Creator Studio</h2>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#12121a] border border-gray-800 rounded-xl p-3">
            <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Available for payout</p>
            <p className="text-2xl font-bold text-white mt-0.5">$1,247.50</p>
            <p className="text-[10px] text-gray-500 mt-1">Min: $100 USDT / 3,000 ₽ / €100</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors">
            Withdraw <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="bg-[#12121a] border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-pink-400" />
          Recent Tips
        </h3>
        <div className="space-y-2">
          {recentTips.map((tip, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm">{tip.gift}</span>
                <span className="text-xs text-gray-400">{tip.user}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-400">{tip.amount} ⭐</span>
                <span className="text-[10px] text-gray-600">{tip.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
