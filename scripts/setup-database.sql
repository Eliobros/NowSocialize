-- MongoDB collections will be created automatically when first document is inserted
-- This is just for reference of the data structure

-- Users collection structure:
-- {
--   _id: ObjectId,
--   name: String,
--   email: String (unique),
--   password: String (hashed),
--   createdAt: Date
-- }

-- Posts collection structure:
-- {
--   _id: ObjectId,
--   content: String,
--   authorId: ObjectId (reference to users._id),
--   createdAt: Date,
--   likes: Number
-- }

-- Create indexes for better performance
-- db.users.createIndex({ "email": 1 }, { unique: true })
-- db.posts.createIndex({ "createdAt": -1 })
-- db.posts.createIndex({ "authorId": 1 })
