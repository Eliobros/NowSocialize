import { type NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import cloudinary from '@/lib/cloudinary';

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

export async function GET(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("socializenow");
    const posts = db.collection("posts");

    const userId = new ObjectId(user.userId);

    const postsList = await posts
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $lookup: {
            from: "likes",
            let: { postId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$postId", "$$postId"] }, { $eq: ["$userId", userId] }],
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
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    return NextResponse.json({ posts: postsList });
  } catch (error) {
    console.error("Get posts error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = verifyToken(request);
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type");
    let content = "";
    let imagePath = "";

    if (contentType?.includes("multipart/form-data")) {
      // Post com imagem
      const formData = await request.formData();
      content = (formData.get("content") as string) || "";
      const image = formData.get("image") as File;

      if (!image && !content.trim()) {
        return NextResponse.json({ error: "Conteúdo ou imagem é obrigatório" }, { status: 400 });
      }

      if (image) {
        if (!image.type.startsWith("image/")) {
          return NextResponse.json({ error: "Apenas arquivos de imagem são permitidos" }, { status: 400 });
        }

        if (image.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "A imagem deve ter no máximo 5MB" }, { status: 400 });
        }

        // Converter a imagem para base64
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString('base64');
        const dataURI = `data:${image.type};base64,${base64}`;

        // Upload para Cloudinary na pasta "posts"
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'posts',
          use_filename: true,
          unique_filename: false,
        });

        imagePath = uploadResult.secure_url;
      }
    } else {
      // Post só texto (JSON)
      const body = await request.json();
      content = body.content;

      if (!content || typeof content !== "string" || !content.trim()) {
        return NextResponse.json({ error: "Conteúdo inválido" }, { status: 400 });
      }
    }

    // Conexão com MongoDB
    const client = await clientPromise;
    const db = client.db("socializenow");
    const posts = db.collection("posts");

    const newPost: any = {
      authorId: new ObjectId(user.userId),
      content: content.trim(),
      createdAt: new Date(),
      likes: 0,
      commentsCount: 0,
    };

    if (imagePath) {
      newPost.image = imagePath;
    }

    const result = await posts.insertOne(newPost);

    return NextResponse.json({ message: "Post criado com sucesso", postId: result.insertedId });
  } catch (error) {
    console.error("Erro ao criar post:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
