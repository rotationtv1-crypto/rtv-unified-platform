export type Genre =
  | 'News' | 'Sports' | 'Movies' | 'Music' | 'Gaming' | 'Culture'
  | 'Comedy' | 'Documentary' | 'Kids' | 'Lifestyle' | 'Tech' | 'Creator'
  | 'Live' | 'FAST' | 'International' | 'Reality' | 'Talk Show' | 'Drama'
  | 'Sci-Fi' | 'Action' | 'Animation' | 'Classic' | 'Regional' | 'Premium'
  | 'VOD' | 'eSports' | 'Shorts' | 'Highlights' | 'Tutorials' | 'Educational'
  | 'Science' | 'Travel' | 'Food' | 'Fashion' | 'Health' | 'Fitness' | 'Art'
  | 'History' | 'Politics' | 'Space' | 'Automotive' | 'Extreme Sports' | 'Dance'
  | 'Stand-Up' | 'True Crime' | 'Finance' | 'Crypto' | 'Web3' | 'DIY'
  | 'Cooking' | 'Luxury' | 'Fishing' | 'Hunting' | 'Camping' | 'Cycling'
  | 'Martial Arts' | 'Boxing' | 'Wrestling' | 'MMA' | 'Winter Sports'
  | 'Water Sports' | 'Combat Sports' | 'Opera' | 'Theater' | 'Broadway'
  | 'Concert' | 'Festival' | 'Award Show' | 'Game Show' | 'Talent Show'
  | 'Dating' | 'Home Improvement' | 'Real Estate' | 'Wine' | 'Spirits'
  | 'Coffee' | 'Watches' | 'Jewelry' | 'Antiques' | 'Aviation' | 'Maritime'
  | 'Agriculture' | 'Indigenous' | 'LGBTQ' | 'Women' | 'Youth' | 'Family'
  | 'Community' | 'Local' | 'Spiritual' | 'Meditation' | 'Yoga' | 'Paranormal'
  | 'Whistleblower' | 'Open Source' | 'Public Domain' | 'Archive' | 'Retro'
  | 'Art House' | 'Short Film' | 'Feature Film' | 'TV Series' | 'Miniseries'
  | 'Reality Competition' | 'Survival' | 'Live Shopping' | 'Behind The Scenes'
  | 'Interviews' | 'Reviews' | 'How-To' | 'Nature' | 'Wellness'
  | 'Relationships' | 'Parenting' | 'Pets' | 'Wildlife' | 'Environment'
  | 'Climate' | 'Sustainability' | 'Startups' | 'Venture Capital'
  | 'Entrepreneurship' | 'Stock Market' | 'Forex' | 'NFT' | 'DeFi'
  | 'Blockchain' | 'AI' | 'Machine Learning' | 'Robotics' | 'Drones'
  | 'Cybersecurity' | 'Programming' | 'Web Development' | 'App Development'
  | 'UI/UX' | 'Graphic Design' | 'Motion Graphics' | 'Visual Effects'
  | '3D Modeling' | 'Virtual Reality' | 'Augmented Reality' | '360 Video'
  | 'Interactive' | 'Press Conference' | 'Parliament' | 'Congress' | 'Court'
  | 'Trial' | 'Diplomacy' | 'Summit' | 'UN' | 'NATO' | 'EU' | 'Olympics'
  | 'X Games' | 'Formula 1' | 'NASCAR' | 'IndyCar' | 'MotoGP' | 'WRC'
  | 'Super GT' | 'Rallycross' | 'Drifting' | '24 Hours' | 'Le Mans'
  | 'Daytona' | 'WWE' | 'UFC' | 'MLB' | 'NBA' | 'NFL' | 'NHL' | 'MLS'
  | 'Premier League' | 'LaLiga' | 'Serie A' | 'Bundesliga' | 'Ligue 1'
  | 'Champions League' | 'World Cup' | 'Euro' | 'Copa America'
  | 'Pluto TV' | 'Tubi' | 'Roku Channel' | 'Freevee' | 'Plex' | 'Stirr'
  | 'Samsung TV Plus' | 'LG Channels' | 'Xumo' | 'Local Now'
  | 'Events' | 'Investigation' | 'World' | 'Podcasts' | 'Horror' | 'Cult'

export type ContentRating = 'TV-Y' | 'TV-Y7' | 'TV-G' | 'TV-PG' | 'TV-14' | 'TV-MA' | 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | 'NR'

export type ChannelType = 'fast' | 'live' | 'premium' | 'regional' | 'vod' | 'creator'

export interface Program {
  id: string
  title: string
  description?: string
  startTime: string // ISO
  endTime: string
  genre: Genre[]
  rating?: ContentRating
  thumbnailUrl?: string
  episode?: {
    season: number
    number: number
    title?: string
  }
  isLive?: boolean
  isPremiere?: boolean
  isRerun?: boolean
}

export interface Lineup {
  channelId: string
  date: string // YYYY-MM-DD
  programs: Program[]
}

export interface Show {
  id: string
  title: string
  description: string
  genres: Genre[]
  rating: ContentRating
  type: 'series' | 'movie' | 'special' | 'event' | 'live'
  thumbnailUrl?: string
  posterUrl?: string
  trailerUrl?: string
  year?: number
  seasons?: number
  episodes?: number
  duration?: number // minutes
  cast?: string[]
  creators?: string[]
  tags?: string[]
  isOriginal?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  genres: Genre[]
  icon?: string
  color?: string
  sortOrder: number
}

export interface ChannelLineupEntry {
  channelId: string
  channelName: string
  channelLogo?: string
  programs: Program[]
}
