import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Radio } from 'lucide-react'
import { streamingAPI } from '../lib/api'

interface LivePlayerProps {
  channelId: string
  hlsUrl?: string
  streamUid?: string
}

function resolveStreamUid(streamUid?: string, channelId?: string): string | undefined {
  if (streamUid && streamUid.trim()) return streamUid.trim()
  const fromEnv = import.meta.env.VITE_DEFAULT_STREAM_UID
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  if (channelId && /^[a-f0-9]{32}$/i.test(channelId)) return channelId
  return undefined
}

export function LivePlayer({ channelId, hlsUrl, streamUid }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(hlsUrl || null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hlsRef = useRef<{ destroy: () => void } | null>(null)

  const uid = resolveStreamUid(streamUid, channelId)

  useEffect(() => {
    if (hlsUrl) {
      setResolvedUrl(hlsUrl)
      setError(null)
      setIsLoading(true)
      return
    }

    if (!uid) {
      setResolvedUrl(null)
      setIsLoading(false)
      setError(null)
      return
    }

    const abort = new AbortController()
    setIsLoading(true)
    setError(null)

    streamingAPI
      .playback(uid)
      .then((info) => {
        if (abort.signal.aborted) return
        setResolvedUrl(info.hls)
      })
      .catch((err: unknown) => {
        if (abort.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Stream unavailable'
        setError(message)
        setResolvedUrl(null)
        setIsLoading(false)
      })

    return () => abort.abort()
  }, [hlsUrl, uid])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !resolvedUrl) {
      return
    }

    let cancelled = false
    let hls: { destroy: () => void } | null = null
    setIsLoading(true)
    setError(null)

    const onNativeReady = () => {
      setIsLoading(false)
      video.play().catch(() => {})
    }

    const start = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = resolvedUrl
        video.addEventListener('loadedmetadata', onNativeReady)
        return
      }

      const Hls = (await import('hls.js')).default
      if (cancelled) return
      if (!Hls.isSupported()) {
        setError('HLS playback is not supported in this browser')
        setIsLoading(false)
        return
      }

      const instance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })
      hls = instance
      hlsRef.current = instance
      instance.loadSource(resolvedUrl)
      instance.attachMedia(video)
      instance.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        video.play().catch(() => {})
      })
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('Stream error. Please try again.')
          setIsLoading(false)
        }
      })
    }

    start().catch(() => {
      if (!cancelled) {
        setError('Failed to load player')
        setIsLoading(false)
      }
    })

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', onNativeReady)
      hls?.destroy()
      hlsRef.current = null
    }
  }, [resolvedUrl])

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

  const idle = !resolvedUrl && !isLoading && !error

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

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {idle && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-6">
            <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Waiting for live signal</p>
            <p className="text-xs text-gray-500 mt-1">{channelId}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center px-6">
            <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-600/90 text-white text-xs font-medium rounded">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="text-sm text-white/80 font-medium">{channelId}</span>
          </div>
          <button className="p-2 rounded-lg bg-black/40 text-white/80 hover:bg-black/60" type="button">
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {!isPlaying && !isLoading && resolvedUrl && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-blue-600/90 flex items-center justify-center hover:bg-blue-500 transition-colors"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-black/60"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-lg bg-black/40 text-white hover:bg-black/60"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex-1" />

          <button
            type="button"
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
