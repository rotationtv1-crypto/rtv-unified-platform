import type { Category, Show, Lineup, ChannelLineupEntry, Program } from '../types/lineup'

export const categories: Category[] = [
  { id: 'cat-1', name: 'Live TV', slug: 'live', description: 'Real-time broadcasts', genres: ['Live','News','Sports','Events'], color: '#ef4444', sortOrder: 1 },
  { id: 'cat-2', name: 'FAST Channels', slug: 'fast', description: 'Free Ad-Supported Streaming TV', genres: ['FAST','Movies','Reality','Comedy','Classic'], color: '#f59e0b', sortOrder: 2 },
  { id: 'cat-3', name: 'Movies', slug: 'movies', description: 'Feature films & cinema', genres: ['Movies','Action','Drama','Sci-Fi','Classic','Animation'], color: '#8b5cf6', sortOrder: 3 },
  { id: 'cat-4', name: 'Sports', slug: 'sports', description: 'Live games & analysis', genres: ['Sports','eSports','Extreme Sports','Combat Sports','Winter Sports'], color: '#10b981', sortOrder: 4 },
  { id: 'cat-5', name: 'News', slug: 'news', description: 'Breaking news & coverage', genres: ['News','Politics','Investigation','Finance','World'], color: '#3b82f6', sortOrder: 5 },
  { id: 'cat-6', name: 'Entertainment', slug: 'entertainment', description: 'Shows, comedy & culture', genres: ['Comedy','Reality','Talk Show','Game Show','Talent Show'], color: '#ec4899', sortOrder: 6 },
  { id: 'cat-7', name: 'Documentary', slug: 'documentary', description: 'Real stories & discoveries', genres: ['Documentary','Science','Nature','History','True Crime'], color: '#06b6d4', sortOrder: 7 },
  { id: 'cat-8', name: 'Music', slug: 'music', description: 'Concerts, videos & culture', genres: ['Music','Concert','Dance','Opera','Theater'], color: '#f97316', sortOrder: 8 },
  { id: 'cat-9', name: 'Tech & Gaming', slug: 'tech', description: 'Innovation & gameplay', genres: ['Tech','Gaming','eSports','AI','Programming'], color: '#14b8a6', sortOrder: 9 },
  { id: 'cat-10', name: 'Lifestyle', slug: 'lifestyle', description: 'Living well', genres: ['Lifestyle','Food','Travel','Fitness','Health','Fashion'], color: '#eab308', sortOrder: 10 },
  { id: 'cat-11', name: 'Kids', slug: 'kids', description: 'Family-friendly content', genres: ['Kids','Animation','Educational','Family'], color: '#22c55e', sortOrder: 11 },
  { id: 'cat-12', name: 'Creator', slug: 'creator', description: 'Independent creators', genres: ['Creator','VOD','Shorts','Podcasts'], color: '#a855f7', sortOrder: 12 },
  { id: 'cat-13', name: 'International', slug: 'international', description: 'Global perspectives', genres: ['International','Regional','Culture'], color: '#6366f1', sortOrder: 13 },
  { id: 'cat-14', name: 'Finance', slug: 'finance', description: 'Markets & money', genres: ['Finance','Crypto','Stock Market','Venture Capital','Entrepreneurship'], color: '#84cc16', sortOrder: 14 },
]

export const featuredShows: Show[] = [
  { id: 'show-1', title: 'The Midnight Broadcast', description: 'Late-night talk with creator spotlights.', genres: ['Talk Show','Creator'], rating: 'TV-14', type: 'series', year: 2024, seasons: 3, isOriginal: true },
  { id: 'show-2', title: 'Crypto Daily', description: 'Market analysis and blockchain news.', genres: ['Finance','Crypto','News'], rating: 'TV-PG', type: 'series', year: 2024, seasons: 2 },
  { id: 'show-3', title: 'Indie Spotlight', description: 'Independent films and filmmaker interviews.', genres: ['Movies','Art House','Interviews'], rating: 'TV-MA', type: 'series', year: 2023, seasons: 4, isOriginal: true },
  { id: 'show-4', title: 'Esports Championship', description: 'Live tournament coverage.', genres: ['eSports','Gaming','Live'], rating: 'TV-PG', type: 'live', year: 2024 },
  { id: 'show-5', title: 'World Kitchen', description: 'Culinary journeys across cultures.', genres: ['Food','Travel','Lifestyle'], rating: 'TV-G', type: 'series', year: 2023, seasons: 5 },
  { id: 'show-6', title: 'Deep Space', description: 'Documentaries on astronomy and exploration.', genres: ['Science','Space','Documentary'], rating: 'TV-PG', type: 'series', year: 2024, seasons: 2, isOriginal: true },
  { id: 'show-7', title: 'Street Legal', description: 'Urban car culture and motorsports.', genres: ['Automotive','Extreme Sports','Documentary'], rating: 'TV-14', type: 'series', year: 2023, seasons: 3 },
  { id: 'show-8', title: 'Code Breakers', description: 'Profiles of revolutionary programmers.', genres: ['Tech','Programming','Documentary'], rating: 'TV-PG', type: 'series', year: 2024, seasons: 1, isOriginal: true },
  { id: 'show-9', title: 'True North', description: 'Stories from indigenous communities.', genres: ['Indigenous','Documentary','Culture'], rating: 'TV-PG', type: 'series', year: 2023, seasons: 2 },
  { id: 'show-10', title: 'Laugh Track', description: 'Stand-up comedy showcase.', genres: ['Comedy','Stand-Up'], rating: 'TV-MA', type: 'series', year: 2024, seasons: 6 },
  { id: 'show-11', title: 'Fight Night Live', description: 'Boxing and MMA events.', genres: ['Boxing','MMA','Combat Sports','Live'], rating: 'TV-14', type: 'live', year: 2024 },
  { id: 'show-12', title: 'Pixel Perfect', description: 'Digital art and design culture.', genres: ['Art','Graphic Design','UI/UX'], rating: 'TV-G', type: 'series', year: 2023, seasons: 2 },
]

function makeProgram(id: string, title: string, start: string, end: string, genres: string[], opts?: Partial<Program>): Program {
  return {
    id, title, startTime: start, endTime: end,
    genre: genres as Program['genre'],
    description: opts?.description || '',
    rating: opts?.rating || 'TV-PG',
    isLive: opts?.isLive || false,
    isPremiere: opts?.isPremiere || false,
    ...opts,
  }
}

const today = new Date().toISOString().slice(0, 10)

export const sampleLineup: Lineup = {
  channelId: 'rtv-1',
  date: today,
  programs: [
    makeProgram('p1', 'Morning News Now', `${today}T06:00:00Z`, `${today}T09:00:00Z`, ['News'], { isLive: true }),
    makeProgram('p2', 'Crypto Daily', `${today}T09:00:00Z`, `${today}T10:00:00Z`, ['Finance','Crypto']),
    makeProgram('p3', 'Indie Spotlight', `${today}T10:00:00Z`, `${today}T11:30:00Z`, ['Movies','Art House'], { isPremiere: true }),
    makeProgram('p4', 'The Midnight Broadcast', `${today}T11:30:00Z`, `${today}T13:00:00Z`, ['Talk Show','Creator']),
    makeProgram('p5', 'Fight Night Live', `${today}T13:00:00Z`, `${today}T16:00:00Z`, ['Boxing','MMA','Live'], { isLive: true }),
    makeProgram('p6', 'World Kitchen', `${today}T16:00:00Z`, `${today}T17:00:00Z`, ['Food','Travel']),
    makeProgram('p7', 'Deep Space', `${today}T17:00:00Z`, `${today}T18:00:00Z`, ['Science','Space']),
    makeProgram('p8', 'Evening News', `${today}T18:00:00Z`, `${today}T20:00:00Z`, ['News','Politics'], { isLive: true }),
    makeProgram('p9', 'Laugh Track', `${today}T20:00:00Z`, `${today}T21:30:00Z`, ['Comedy','Stand-Up']),
    makeProgram('p10', 'Code Breakers', `${today}T21:30:00Z`, `${today}T22:30:00Z`, ['Tech','Programming']),
    makeProgram('p11', 'True North', `${today}T22:30:00Z`, `${today}T23:30:00Z`, ['Indigenous','Documentary']),
    makeProgram('p12', 'The Midnight Broadcast', `${today}T23:30:00Z`, `${today}T01:00:00Z`, ['Talk Show','Creator'], { isPremiere: true }),
  ]
}

export const channelLineups: ChannelLineupEntry[] = [
  {
    channelId: 'rtv-main',
    channelName: 'RTV Main',
    programs: sampleLineup.programs,
  },
  {
    channelId: 'rtv-sports',
    channelName: 'RTV Sports',
    programs: [
      makeProgram('s1', 'SportsCenter AM', `${today}T06:00:00Z`, `${today}T09:00:00Z`, ['Sports','News'], { isLive: true }),
      makeProgram('s2', 'Formula 1 Practice', `${today}T09:00:00Z`, `${today}T11:00:00Z`, ['Formula 1','Motorsports'], { isLive: true }),
      makeProgram('s3', 'NBA Highlights', `${today}T11:00:00Z`, `${today}T12:00:00Z`, ['NBA','Highlights']),
      makeProgram('s4', 'UFC Countdown', `${today}T12:00:00Z`, `${today}T13:00:00Z`, ['UFC','MMA']),
      makeProgram('s5', 'Fight Night Live', `${today}T13:00:00Z`, `${today}T16:00:00Z`, ['Boxing','MMA','Live'], { isLive: true }),
      makeProgram('s6', 'Premier League Live', `${today}T16:00:00Z`, `${today}T18:00:00Z`, ['Premier League','Soccer'], { isLive: true }),
      makeProgram('s7', 'Esports Championship', `${today}T18:00:00Z`, `${today}T21:00:00Z`, ['eSports','Gaming','Live'], { isLive: true }),
      makeProgram('s8', 'SportsCenter PM', `${today}T21:00:00Z`, `${today}T23:00:00Z`, ['Sports','News'], { isLive: true }),
      makeProgram('s9', 'Extreme Sports', `${today}T23:00:00Z`, `${today}T01:00:00Z`, ['Extreme Sports','Action']),
    ]
  },
  {
    channelId: 'rtv-news',
    channelName: 'RTV News 24',
    programs: [
      makeProgram('n1', 'Early Edition', `${today}T00:00:00Z`, `${today}T06:00:00Z`, ['News'], { isLive: true }),
      makeProgram('n2', 'Morning News Now', `${today}T06:00:00Z`, `${today}T09:00:00Z`, ['News'], { isLive: true }),
      makeProgram('n3', 'Market Open', `${today}T09:00:00Z`, `${today}T10:00:00Z`, ['Finance','News'], { isLive: true }),
      makeProgram('n4', 'Press Conference Live', `${today}T10:00:00Z`, `${today}T11:00:00Z`, ['Politics','Live'], { isLive: true }),
      makeProgram('n5', 'Midday Report', `${today}T11:00:00Z`, `${today}T14:00:00Z`, ['News'], { isLive: true }),
      makeProgram('n6', 'Investigation Desk', `${today}T14:00:00Z`, `${today}T15:00:00Z`, ['Investigation','True Crime']),
      makeProgram('n7', 'Evening News', `${today}T18:00:00Z`, `${today}T20:00:00Z`, ['News','Politics'], { isLive: true }),
      makeProgram('n8', 'World Tonight', `${today}T20:00:00Z`, `${today}T22:00:00Z`, ['News','International'], { isLive: true }),
      makeProgram('n9', 'Late Edition', `${today}T22:00:00Z`, `${today}T00:00:00Z`, ['News'], { isLive: true }),
    ]
  },
  {
    channelId: 'rtv-movies',
    channelName: 'RTV Cinema',
    programs: [
      makeProgram('m1', 'Classic Cinema', `${today}T06:00:00Z`, `${today}T08:30:00Z`, ['Classic','Movies']),
      makeProgram('m2', 'Action Blockbuster', `${today}T08:30:00Z`, `${today}T11:00:00Z`, ['Action','Movies']),
      makeProgram('m3', 'Indie Spotlight', `${today}T11:00:00Z`, `${today}T12:30:00Z`, ['Movies','Art House'], { isPremiere: true }),
      makeProgram('m4', 'Sci-Fi Marathon', `${today}T12:30:00Z`, `${today}T15:00:00Z`, ['Sci-Fi','Movies']),
      makeProgram('m5', 'Drama Collection', `${today}T15:00:00Z`, `${today}T17:30:00Z`, ['Drama','Movies']),
      makeProgram('m6', 'Animation Nation', `${today}T17:30:00Z`, `${today}T19:00:00Z`, ['Animation','Movies']),
      makeProgram('m7', 'Feature Film Premiere', `${today}T19:00:00Z`, `${today}T21:30:00Z`, ['Movies'], { isPremiere: true }),
      makeProgram('m8', 'Horror Night', `${today}T21:30:00Z`, `${today}T23:30:00Z`, ['Movies','Horror']),
      makeProgram('m9', 'Midnight Movie', `${today}T23:30:00Z`, `${today}T01:30:00Z`, ['Movies','Cult']),
    ]
  },
  {
    channelId: 'rtv-kids',
    channelName: 'RTV Kids',
    programs: [
      makeProgram('k1', 'Morning Cartoons', `${today}T06:00:00Z`, `${today}T09:00:00Z`, ['Kids','Animation'], { rating: 'TV-Y7' }),
      makeProgram('k2', 'Educational Hour', `${today}T09:00:00Z`, `${today}T10:00:00Z`, ['Educational','Kids'], { rating: 'TV-Y' }),
      makeProgram('k3', 'Adventure Time', `${today}T10:00:00Z`, `${today}T11:00:00Z`, ['Kids','Animation'], { rating: 'TV-Y7' }),
      makeProgram('k4', 'Science Kids', `${today}T11:00:00Z`, `${today}T12:00:00Z`, ['Science','Educational'], { rating: 'TV-Y7' }),
      makeProgram('k5', 'Family Movie', `${today}T12:00:00Z`, `${today}T14:00:00Z`, ['Family','Movies'], { rating: 'TV-G' }),
      makeProgram('k6', 'Nature Explorers', `${today}T14:00:00Z`, `${today}T15:00:00Z`, ['Nature','Kids'], { rating: 'TV-G' }),
      makeProgram('k7', 'Creative Corner', `${today}T15:00:00Z`, `${today}T16:00:00Z`, ['Art','Kids'], { rating: 'TV-Y' }),
      makeProgram('k8', 'Bedtime Stories', `${today}T18:00:00Z`, `${today}T19:00:00Z`, ['Kids','Family'], { rating: 'TV-Y' }),
      makeProgram('k9', 'Night Lights', `${today}T19:00:00Z`, `${today}T20:00:00Z`, ['Animation','Kids'], { rating: 'TV-Y7' }),
    ]
  }
]

export const genreColors: Record<string, string> = {
  News: '#3b82f6', Sports: '#10b981', Movies: '#8b5cf6', Music: '#f97316',
  Gaming: '#ec4899', Culture: '#06b6d4', Comedy: '#eab308', Documentary: '#14b8a6',
  Kids: '#22c55e', Lifestyle: '#f472b6', Tech: '#6366f1', Creator: '#a855f7',
  Live: '#ef4444', FAST: '#f59e0b', International: '#8b5cf6', Reality: '#ec4899',
  'Talk Show': '#3b82f6', Drama: '#f43f5e', 'Sci-Fi': '#06b6d4', Action: '#dc2626',
  Animation: '#f59e0b', Classic: '#78716c', Regional: '#84cc16', Premium: '#d946ef',
  VOD: '#6366f1', eSports: '#8b5cf6', Shorts: '#14b8a6', Finance: '#84cc16',
  Crypto: '#f59e0b', Programming: '#10b981', Food: '#f97316', Travel: '#3b82f6',
  Fitness: '#22c55e', Art: '#ec4899', Science: '#06b6d4', History: '#78716c',
  Politics: '#6366f1', Space: '#1e40af', Automotive: '#dc2626', Boxing: '#ef4444',
  MMA: '#dc2626', UFC: '#dc2626', WWE: '#dc2626', 'Premier League': '#3b82f6',
  NBA: '#f97316', NFL: '#8b5cf6', NHL: '#06b6d4', MLB: '#ef4444', MLS: '#10b981',
}
