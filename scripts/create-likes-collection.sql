-- Create likes collection for MongoDB
-- Run this in MongoDB Compass or MongoDB shell

use socializenow;

// Create likes collection
db.createCollection("likes");

// Create indexes for better performance
db.likes.createIndex({ "userId": 1, "postId": 1 }, { unique: true });
db.likes.createIndex({ "postId": 1 });
db.likes.createIndex({ "userId": 1 });
db.likes.createIndex({ "createdAt": -1 });

// Sample data structure (for reference)
/*
{
  "_id": ObjectId,
  "userId": ObjectId,
  "postId": ObjectId,
  "createdAt": Date
}
*/
