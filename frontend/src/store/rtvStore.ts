import { create } from 'zustand'

export interface User {
  id: string
  telegramId: string
  username?: string
  displayName: string
  isCreator: boolean
  isAdmin: boolean
  balanceStars: number
  balanceRtv: number
}

export interface Channel {
  id: string
  slug: string
  name: string
  description: string
  logoUrl?: string
  category: string
  isLive: boolean
  isFast: boolean
  hlsUrl?: string
  currentProgram?: string
  viewerCount: number
}

export interface Stream {
  id: string
  title: string
  description?: string
  creatorName: string
  thumbnailUrl?: string
  hlsUrl?: string
  status: string
  viewerCount: number
  totalTipsStars: number
}

export interface VODItem {
  id: string
  title: string
  creatorName: string
  thumbnailUrl?: string
  videoUrl: string
  durationSeconds: number
  category: string
  viewCount: number
}

interface RTVStore {
  user: User | null
  token: string | null
  channels: Channel[]
  streams: Stream[]
  vodItems: VODItem[]
  currentStream: Stream | null
  currentChannel: Channel | null
  isLoading: boolean
  activeTab: 'channels' | 'live' | 'vod' | 'creator' | 'admin'
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setChannels: (channels: Channel[]) => void
  setStreams: (streams: Stream[]) => void
  setVodItems: (items: VODItem[]) => void
  setCurrentStream: (stream: Stream | null) => void
  setCurrentChannel: (channel: Channel | null) => void
  setIsLoading: (loading: boolean) => void
  setActiveTab: (tab: 'channels' | 'live' | 'vod' | 'creator' | 'admin') => void
  logout: () => void
}

export const useRTVStore = create<RTVStore>((set) => ({
  user: null,
  token: null,
  channels: [],
  streams: [],
  vodItems: [],
  currentStream: null,
  currentChannel: null,
  isLoading: false,
  activeTab: 'channels',
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setChannels: (channels) => set({ channels }),
  setStreams: (streams) => set({ streams }),
  setVodItems: (vodItems) => set({ vodItems }),
  setCurrentStream: (currentStream) => set({ currentStream }),
  setCurrentChannel: (currentChannel) => set({ currentChannel }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActiveTab: (activeTab) => set({ activeTab }),
  logout: () => set({ user: null, token: null, currentStream: null, currentChannel: null }),
}))
