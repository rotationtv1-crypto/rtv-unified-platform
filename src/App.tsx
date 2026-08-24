import { Routes, Route, Navigate } from 'react-router-dom'
import { MiniAppLayout } from './sections/MiniAppLayout'
import { WebLayout } from './sections/WebLayout'
import { LandingPage } from './sections/LandingPage'
import { WebAuth } from './sections/WebAuth'
import { WebChannelBrowser } from './sections/WebChannelBrowser'
import { WebLiveStreams } from './sections/WebLiveStreams'
import { WebVOD } from './sections/WebVOD'
import { WebWatch } from './sections/WebWatch'
import { CategoryBrowser } from './components/CategoryBrowser'
import { TVGuide } from './components/TVGuide'

function isRunningInTelegram(): boolean {
  if (typeof window === 'undefined') return false

  // URL override for testing: ?mode=web or ?mode=telegram
  const params = new URLSearchParams(window.location.search)
  const modeParam = params.get('mode')
  if (modeParam === 'telegram') return true
  if (modeParam === 'web') return false

  // Check for actual Telegram WebApp with valid initData
  const twa = window.Telegram?.WebApp
  if (!twa) return false

  // Telegram always provides initData when opening a Mini App
  // Some browser extensions inject window.Telegram without initData
  const hasInitData = typeof twa.initData === 'string' && twa.initData.length > 0
  const hasPlatform = typeof twa.platform === 'string' && twa.platform.length > 0
  const hasVersion = typeof twa.version === 'string' && twa.version.length > 0

  // Must have initData AND (platform or version) to be considered real Telegram
  return hasInitData && (hasPlatform || hasVersion)
}

function App() {
  const isTelegramMiniApp = isRunningInTelegram()

  // Telegram Mini App mode - use tab-based navigation
  if (isTelegramMiniApp) {
    return <MiniAppLayout />
  }

  // Standalone web mode - use React Router with top navigation
  return (
    <Routes>
      <Route element={<WebLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/channels" element={<WebChannelBrowser />} />
        <Route path="/live" element={<WebLiveStreams />} />
        <Route path="/vod" element={<WebVOD />} />
        <Route path="/browse" element={<CategoryBrowser />} />
        <Route path="/guide" element={<TVGuide />} />
        <Route path="/watch/:id" element={<WebWatch />} />
        <Route path="/auth" element={<WebAuth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
