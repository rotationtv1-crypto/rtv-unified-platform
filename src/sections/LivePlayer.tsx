import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Radio } from 'lucide-react'

interface LivePlayerProps {
  channelId: string
  hlsUrl?: string
}

export function LivePlayer({ channelId, hlsUrl }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const hlsRef = useRef<any>(null)

  const streamUrl = hlsUrl || `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`

  useEffect(() => {
    let hls: any = null

    const initPlayer = async () => {
      try {
        const video = videoRef.current
        if (!video) return

        // Check if HLS.js is needed (for non-native HLS support)
        const needsHlsJs = !video.canPlayType('application/vnd.apple.mpegurl')

        if (needsHlsJs) {
          const Hls = (await import('hls.js')).default
          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
            })
            hlsRef.current = hls

            hls.loadSource(streamUrl)
            hls.attachMedia(video)

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false)
              video.play().catch(() => {
                // Autoplay blocked
              })
            })

            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
              if (data.fatal) {
                setError('Stream error. Please try again.')
                setIsLoading(false)
              }
            })
          }
        } else {
          // Native HLS support (Safari)
          video.src = streamUrl
          video.addEventListener('loadedmetadata', () => {
            setIsLoading(false)
            video.play().catch(() => {})
          })
        }
      } catch (err) {
        setError('Failed to load player')
        setIsLoading(false)
      }
    }

    initPlayer()

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [streamUrl])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      video.requestFullscreen()
    }
  }

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  return (
    <div
      className="relative w-full h-full bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600/90 text-white text-xs font-medium rounded">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="text-sm text-white/80 font-medium">{channelId}</span>
          </div>
          <button className="p-2 rounded-lg bg-black/40 text-white/80 hover:bg-black/60">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Center Play Button */}
        {!isPlaying && !isLoading && (
          <button
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-blue-600/90 flex items-center justify-center hover:bg-blue-500 transition-colors"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        )}

        {/* Bottom Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-black/60"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-black/60"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex-1" />

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-black/60"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
