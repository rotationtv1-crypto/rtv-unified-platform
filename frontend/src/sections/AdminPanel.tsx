import { useState } from 'react'
import { useRTVStore } from '../store/rtvStore'
import { Shield, Users, Radio, DollarSign, AlertCircle } from 'lucide-react'

export function AdminPanel() {
  const { user } = useRTVStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payouts'>('overview')

  if (!user?.isAdmin) {
    return (
      <div className="p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
        <p className="text-gray-400">Admin access required</p>
      </div>
    )
  }

  const overviewStats = [
    { label: 'Total Users', value: '45,231', icon: Users, color: 'text-blue-400' },
    { label: 'Live Streams', value: '12', icon: Radio, color: 'text-red-400' },
    { label: 'Creators', value: '1,847', icon: Users, color: 'text-green-400' },
    { label: 'Pending Payouts', value: '$24,580', icon: DollarSign, color: 'text-yellow-400' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-red-400" />
        <h2 className="text-lg font-bold">Admin Panel</h2>
      </div>

      <div className="flex gap-2">
        {(['overview', 'users', 'payouts'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-red-600/20 text-red-400 border border-red-600/30' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-3">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="bg-[#12121a] border border-gray-800 rounded-xl p-3">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800 text-xs font-semibold text-gray-400 grid grid-cols-4">
            <span>User</span>
            <span>Status</span>
            <span>Earnings</span>
            <span>Action</span>
          </div>
          {[
            { name: 'Darrel', status: 'creator', earnings: '$12,450' },
            { name: 'StreamKing', status: 'creator', earnings: '$8,230' },
            { name: 'NewUser42', status: 'viewer', earnings: '$0' },
          ].map((u, i) => (
            <div key={i} className="p-3 border-b border-gray-800/50 text-xs grid grid-cols-4 items-center">
              <span className="text-white">{u.name}</span>
              <span className={`${u.status === 'creator' ? 'text-green-400' : 'text-gray-500'}`}>{u.status}</span>
              <span className="text-gray-400">{u.earnings}</span>
              <button className="text-blue-400 hover:text-blue-300">View</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-800 text-xs font-semibold text-gray-400 grid grid-cols-5">
            <span>Creator</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {[
            { creator: 'Darrel', amount: '$1,247.50', method: 'USDT', status: 'pending' },
            { creator: 'StreamQueen', amount: '€150.00', method: 'EUR', status: 'pending' },
            { creator: 'GamerPro', amount: '5,000 ₽', method: 'RUB', status: 'processing' },
          ].map((p, i) => (
            <div key={i} className="p-3 border-b border-gray-800/50 text-xs grid grid-cols-5 items-center">
              <span className="text-white">{p.creator}</span>
              <span className="text-gray-300">{p.amount}</span>
              <span className="text-gray-400">{p.method}</span>
              <span className={`${p.status === 'pending' ? 'text-yellow-400' : 'text-blue-400'}`}>{p.status}</span>
              <button className="text-green-400 hover:text-green-300">Approve</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
