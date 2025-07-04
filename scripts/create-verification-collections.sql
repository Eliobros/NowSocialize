-- Create collections for verification system and support

-- Verification requests collection structure:
-- {
--   _id: ObjectId,
--   userId: ObjectId (reference to users._id),
--   fullName: String,
--   birthDate: Date,
--   documentFront: String (file path),
--   documentBack: String (file path),
--   reason: String,
--   status: String ("pending", "approved", "rejected"),
--   createdAt: Date,
--   updatedAt: Date
-- }

-- Support tickets collection structure:
-- {
--   _id: ObjectId,
--   userId: ObjectId (reference to users._id),
--   name: String,
--   username: String,
--   email: String,
--   subject: String,
--   message: String,
--   status: String ("open", "closed"),
--   createdAt: Date,
--   updatedAt: Date
-- }

-- Update users collection to include verification status
-- db.users.updateMany({}, {
--   $set: {
--     isVerified: false
--   }
-- })

-- Update posts collection to include comments count
-- db.posts.updateMany({}, {
--   $set: {
--     commentsCount: 0
--   }
-- })

-- Create indexes for better performance
-- db.verifyRequests.createIndex({ "userId": 1 })
-- db.verifyRequests.createIndex({ "status": 1 })
-- db.verifyRequests.createIndex({ "createdAt": -1 })
-- db.supportTickets.createIndex({ "userId": 1 })
-- db.supportTickets.createIndex({ "status": 1 })
-- db.supportTickets.createIndex({ "createdAt": -1 })

-- Create directory for documents (this would be done at OS level)
-- mkdir -p public/documents
