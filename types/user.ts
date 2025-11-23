export interface User {
  _id: string
  name: string
  username: string
  email: string
  password: string
  bio?: string
  avatar?: string
  isVerified?: boolean
  followers?: string[]
  following?: string[]
  postsCount?: number
  createdAt?: Date
  updatedAt?: Date
}
