export type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type Pin = {
  id: string
  owner_id: string
  title: string
  description: string
  live_url: string
  repo_url: string | null
  media_url: string
  media_type: 'image' | 'video'
  thumbnail_url: string
  is_published: boolean
  sort_index?: number | null
  created_at: string
  updated_at: string
  // joined
  profile?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
  tags?: Tag[]
}

export type Tag = {
  id: string
  name: string
}

export type Board = {
  id: string
  owner_id: string
  name: string
  description: string
  is_private: boolean
  created_at: string
  updated_at: string
}

export type BoardPin = {
  board_id: string
  pin_id: string
  saved_at: string
}

export type FollowStatus = {
  is_following: boolean
  follower_count: number
  following_count: number
}

export type FollowUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}