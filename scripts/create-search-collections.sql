-- Create additional collections for search and follow functionality

-- Follows collection structure:
-- {
--   _id: ObjectId,
--   followerId: ObjectId (reference to users._id - who is following),
--   followingId: ObjectId (reference to users._id - who is being followed),
--   createdAt: Date
-- }

-- Update users collection to include search-friendly fields
-- db.users.updateMany({}, {
--   $set: {
--     username: "",
--     bio: "",
--     avatar: "",
--     followers: 0,
--     following: 0
--   }
-- })

-- Create indexes for better search performance
-- db.users.createIndex({ "name": "text", "username": "text", "email": "text" })
-- db.users.createIndex({ "username": 1 }, { unique: true, sparse: true })
-- db.follows.createIndex({ "followerId": 1, "followingId": 1 }, { unique: true })
-- db.follows.createIndex({ "followerId": 1 })
-- db.follows.createIndex({ "followingId": 1 })

-- Create directory for profile images (this would be done at OS level)
-- mkdir -p public/image_profiles
