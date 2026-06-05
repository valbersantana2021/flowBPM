export interface Profile {
  id: string
  fullName: string | null
  avatarUrl: string | null
  plan: 'free' | 'pro' | 'business'
  stripeCustomerId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  xml?: string
  timestamp: Date
}
