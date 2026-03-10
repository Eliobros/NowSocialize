// app/api/translate/route.ts
export async function POST(req: Request) {
  const { text, target } = await req.json()
  
  const response = await fetch('http://localhost:5000/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target })
  })
  
  const data = await response.json()
  return Response.json({ translatedText: data.translatedText })
}
