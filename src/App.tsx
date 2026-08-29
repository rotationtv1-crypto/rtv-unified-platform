import { Routes, Route, Navigate } from 'react-router-dom'
import { WebLayout } from './sections/WebLayout'
import { LandingPage } from './sections/LandingPage'
import { WebAuth } from './sections/WebAuth'
import { WebChannelBrowser } from './sections/WebChannelBrowser'
import { WebLiveStreams } from './sections/WebLiveStreams'
import { WebVOD } from './sections/WebVOD'
import { WebWatch } from './sections/WebWatch'
import { CategoryBrowser } from './components/CategoryBrowser'
import { TVGuide } from './components/TVGuide'
import { AIStudio } from './sections/AIStudio'

function App() {
  // Telegram Mini App shell is retired. Cable player is rtv-broadcast (web).
  return (
    <Routes>
      <Route element={<WebLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/channels" element={<WebChannelBrowser />} />
        <Route path="/live" element={<WebLiveStreams />} />
        <Route path="/vod" element={<WebVOD />} />
        <Route path="/browse" element={<CategoryBrowser />} />
        <Route path="/guide" element={<TVGuide />} />
        <Route path="/studio" element={<AIStudio />} />
        <Route path="/watch/:id" element={<WebWatch />} />
        <Route path="/auth" element={<WebAuth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
