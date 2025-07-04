'use client';

import React, { useState } from 'react';

export default function TestPage() {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!image) return alert('Selecione uma imagem');

    setUploading(true);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await fetch('/api/cloudinary/test', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      setResponse({ error: 'Erro ao enviar imagem' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Upload Test Cloudinary</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={uploading}>
          {uploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {response && (
        <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </main>
  );
}
