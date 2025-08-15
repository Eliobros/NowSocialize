// app/api/posts/[postId]/route.ts
import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const posts = db.collection("posts");

    const userId = new ObjectId(user.userId);
    const postId = new ObjectId(params.postId);

    const postResult = await posts
      .aggregate([
        { $match: { _id: postId } },
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },
        {
          $lookup: {
            from: "likes",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$postId", "$$postId"] },
                      { $eq: ["$userId", userId] },
                    ],
                  },
                },
              },
            ],
            as: "userLiked",
          },
        },
        {
          $lookup: {
            from: "comments",
            localField: "_id",
            foreignField: "postId",
            as: "comments",
          },
        },
        {
          $addFields: {
            likedByUser: { $gt: [{ $size: "$userLiked" }, 0] },
            commentsCount: { $size: "$comments" },
          },
        },
        {
          $project: {
            content: 1,
            image: 1,
            createdAt: 1,
            likes: 1,
            likedByUser: 1,
            commentsCount: 1,
            "author._id": 1,
            "author.name": 1,
            "author.email": 1,
            "author.avatar": 1,
            "author.isVerified": 1,
          },
        },
      ])
      .toArray();

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
    }

    // Transformar _id em string
    const post = {
      ...postResult[0],
      _id: postResult[0]._id.toString(),
      author: {
        ...postResult[0].author,
        _id: postResult[0].author._id.toString(),
      },
    };

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Get post error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}