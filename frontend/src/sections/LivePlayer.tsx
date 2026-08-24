import { useEffect, useRef, useState } from 'react'
import { useRTVStore } from '../store/rtvStore'
import { ArrowLeft, Radio, Eye, MessageCircle, Gift, Volume2, VolumeX, Maximize } from 'lucide-react'

const GIFT_ITEMS = [
  { type: 'rose', emoji: '🌹', stars: 1, usd: 0.013 },
  { type: 'star', emoji: '⭐', stars: 5, usd: 0.065 },
  { type: 'rocket', emoji: '🚀', stars: 10, usd: 0.13 },
  { type: 'crown', emoji: '👑', stars: 50, usd: 0.65 },
  { type: 'diamond', emoji: '💎', stars: 100, usd: 1.3 },
  { type: 'cable', emoji: '📡', stars: 500, usd: 6.5 },
]

export function LivePlayer() {
  const { currentChannel, currentStream, setCurrentChannel, setCurrentStream, setActiveTab, user } = useRTVStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showGifts, setShowGifts] = useState(false)
  const [chatMessage, setChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; color: string }[]>([])

  const activeItem = currentStream || currentChannel
  const isChannel = !!currentChannel && !currentStream

  useEffect(() => {
    if (activeItem?.hlsUrl && videoRef.current) {
      videoRef.current.src = activeItem.hlsUrl
    }
  }, [activeItem])

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  const handleSendGift = async (gift: typeof GIFT_ITEMS[0]) => {
    if (!user) return
    if (user.balanceStars < gift.stars) {
      alert('Insufficient Stars balance')
      return
    }
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success')
    }
    setChatMessages((prev) => [
      ...prev,
      { user: user.displayName, text: `sent ${gift.emoji} x1`, color: '#fbbf24' },
    ])
    setShowGifts(false)
  }

  const handleSendChat = () => {
    if (!chatMessage.trim() || !user) return
    setChatMessages((prev) => [
      ...prev,
      { user: user.displayName, text: chatMessage, color: '#60a5fa' },
    ])
    setChatMessage('')
  }

  if (!activeItem) {
    return (
      <div className="p-4 text-center">
        <div className="bg-[#12121a] border border-gray-800 rounded-2xl p-8">
          <Radio className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Select a channel to start watching</p>
          <button
            onClick={() => setActiveTab('channels')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            Browse Channels
          </button>
        </div>
      </div>
    )
  }

  const displayName = isChannel ? currentChannel?.name : currentStream?.title
  const displayDesc = isChannel ? currentChannel?.description : currentStream?.description
  const logoUrl = isChannel ? currentChannel?.logoUrl : currentStream?.thumbnailUrl
  const viewerCount = activeItem.viewerCount || 0
  const isLive = isChannel ? currentChannel?.isLive : (currentStream?.status === 'live')

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted={isMuted}
          loop
          poster={logoUrl}
        />

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <button
              onClick={handlePlay}
              className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Radio className="w-7 h-7 text-white" />
            </button>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={() => { setCurrentChannel(null); setCurrentStream(null); setActiveTab('channels') }}
            className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE
              </span>
            )}
            <span className="bg-black/40 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
              <Eye className="w-3 h-3" /> {viewerCount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button className="w-8 h-8 bg-black/40 rounded-full flex items-center justify-center">
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-gray-800">
        <h2 className="font-semibold text-sm">{displayName}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{displayDesc || 'Live streaming now'}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {chatMessages.length === 0 && (
          <p className="text-center text-gray-600 text-xs py-4">Welcome to the chat! Say hello 👋</p>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i} className="text-xs">
            <span className="font-medium" style={{ color: msg.color }}>{msg.user}</span>
            {' '}
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-800 bg-[#0a0a0f]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGifts(!showGifts)}
            className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shrink-0"
          >
            <Gift className="w-4 h-4 text-white" />
          </button>
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
            placeholder="Say something..."
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendChat}
            className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center shrink-0"
          >
            <MessageCircle className="w-4 h-4 text-white" />
          </button>
        </div>

        {showGifts && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {GIFT_ITEMS.map((gift) => (
              <button
                key={gift.type}
                onClick={() => handleSendGift(gift)}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-2 flex flex-col items-center gap-1 active:scale-95 transition-transform"
              >
                <span className="text-lg">{gift.emoji}</span>
                <span className="text-[10px] text-yellow-400 font-medium">{gift.stars} ⭐</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
