import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  Clapperboard,
  FileCode2,
  Github,
  Image as ImageIcon,
  Mic2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from 'lucide-react'

type Stage = 'source' | 'script' | 'film' | 'voice' | 'export'

const stages: { id: Stage; label: string; icon: typeof Github }[] = [
  { id: 'source', label: 'Source intake', icon: Github },
  { id: 'script', label: 'Film script', icon: FileCode2 },
  { id: 'film', label: 'Short film', icon: Clapperboard },
  { id: 'voice', label: 'Voice track', icon: Mic2 },
  { id: 'export', label: 'Network export', icon: Play },
]

const initialJobs = [
  { title: 'The Signal / Episode 01', type: 'Short film', status: 'Ready for voice', progress: 68, color: 'bg-cyan-400' },
  { title: 'RTV Weekly — Issue 34', type: 'Network package', status: 'Rendering storyboard', progress: 42, color: 'bg-violet-400' },
  { title: 'Open Source Futures', type: 'Documentary', status: 'Source indexed', progress: 18, color: 'bg-amber-300' },
]

export function AIStudio() {
  const [activeStage, setActiveStage] = useState<Stage>('source')
  const [repo, setRepo] = useState('rotationtv1-crypto/rtv-unified-platform')
  const [idea, setIdea] = useState('')
  const [jobs, setJobs] = useState(initialJobs)
  const [notice, setNotice] = useState('')

  const activeIndex = useMemo(() => stages.findIndex((stage) => stage.id === activeStage), [activeStage])

  function createProject() {
    const title = idea.trim() || 'Untitled RTV project'
    setJobs((current) => [
      { title, type: 'New production', status: 'Source intake queued', progress: 4, color: 'bg-cyan-400' },
      ...current,
    ])
    setIdea('')
    setNotice('Production workspace created. The adapter pipeline is ready for provider credentials.')
    setActiveStage('source')
  }

  function advance() {
    const next = stages[Math.min(activeIndex + 1, stages.length - 1)].id
    setActiveStage(next)
    setNotice(`${stages[Math.min(activeIndex + 1, stages.length - 1)].label} workspace selected.`)
  }

  return (
    <section className="flex flex-col gap-8 py-4 lg:py-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            <Sparkles className="h-4 w-4" /> RTV AI studio
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-5xl">From signal to screen.</h1>
          <p className="max-w-xl text-pretty text-base leading-7 text-slate-400">A production control room for turning authorized source material into broadcast-ready stories, shorts, and voice-led network packages.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" /></span>
          Adapter runtime online
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-h-[320px] flex-col justify-between rounded-2xl border border-slate-800 bg-slate-950 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2"><span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">New production</span><h2 className="text-2xl font-semibold text-white">Build a broadcast package</h2><p className="text-sm leading-6 text-slate-400">Describe the story. The studio will stage every creative handoff for review.</p></div>
            <div className="hidden rounded-xl bg-cyan-400/10 p-3 text-cyan-300 sm:block"><WandSparkles className="h-6 w-6" /></div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="sr-only" htmlFor="production-idea">Production idea</label>
            <textarea id="production-idea" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="A short documentary about the people building the open internet..." className="min-h-24 resize-none rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-cyan-400" />
            <div className="flex flex-col gap-3 sm:flex-row"><button onClick={createProject} className="rtv-btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-400 font-semibold text-slate-950 hover:bg-cyan-300"><Plus className="h-4 w-4" /> Start production</button><button onClick={() => setNotice('Provider adapters are configurable: text, image, video, and voice can be connected independently.')} className="rtv-btn flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"><RefreshCw className="h-4 w-4" /> Check adapters</button></div>
          </div>
        </div>
        <div className="flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-7"><div className="flex items-center justify-between"><div><span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">System map</span><h2 className="mt-2 text-xl font-semibold text-white">Creative pipeline</h2></div><ImageIcon className="h-5 w-5 text-slate-500" /></div><div className="flex flex-col gap-2">{stages.map((stage, index) => { const Icon = stage.icon; const complete = index < activeIndex; const active = index === activeIndex; return <button key={stage.id} onClick={() => setActiveStage(stage.id)} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-left transition-colors ${active ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-400 hover:bg-slate-800/70'}`}><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${complete ? 'bg-cyan-400 text-slate-950' : active ? 'bg-cyan-400/20' : 'bg-slate-800'}`}>{complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><span className="flex-1 text-sm font-medium">{stage.label}</span>{active && <span className="text-[10px] uppercase tracking-widest">active</span>}</button> })}</div><button onClick={advance} disabled={activeIndex === stages.length - 1} className="rtv-btn flex items-center justify-center gap-2 rounded-xl border border-slate-700 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-40">Advance stage <ArrowRight className="h-4 w-4" /></button></div>
      </div>

      {notice && <div role="status" className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-200">{notice}</div>}

      <div className="flex flex-col gap-4"><div className="flex items-center justify-between"><div><span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Production queue</span><h2 className="mt-2 text-2xl font-semibold text-white">Active workspaces</h2></div><span className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">{jobs.length} projects</span></div><div className="grid gap-3">{jobs.map((job) => <article key={`${job.title}-${job.progress}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className={`h-12 w-1 rounded-full ${job.color}`} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><h3 className="truncate font-semibold text-white">{job.title}</h3><span className="text-xs text-slate-500">{job.type}</span></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${job.color}`} style={{ width: `${job.progress}%` }} /></div><span className="text-xs tabular-nums text-slate-400">{job.progress}%</span></div></div><span className="text-sm text-slate-400 sm:w-40 sm:text-right">{job.status}</span></div></article>)}</div></div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Github className="h-5 w-5 text-slate-400" /><div><p className="text-sm font-medium text-white">Authorized repository intake</p><p className="text-xs text-slate-500">Only fetch repositories you own or have explicitly authorized.</p></div></div><div className="flex w-full gap-2 sm:w-auto"><label className="sr-only" htmlFor="repo">Repository</label><input id="repo" value={repo} onChange={(event) => setRepo(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 text-base text-slate-200 outline-none focus:border-cyan-400 sm:w-72" /><button onClick={() => setNotice(`Fetch queued for ${repo}. Content will be attributed, bounded, and hashed before entering the pipeline.`)} className="rtv-btn rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-950 hover:bg-white">Fetch</button></div></div>
    </section>
  )
}
