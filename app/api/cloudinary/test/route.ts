import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Função para upload via buffer
function streamUpload(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'test' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('image');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nenhuma imagem enviada' }, { status: 400 });
    }

    // Ler o arquivo em buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await streamUpload(buffer);

    return NextResponse.json({ message: 'Upload feito com sucesso!', data: result });
  } catch (error) {
    console.error('Erro upload Cloudinary:', error);
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 });
  }
}
