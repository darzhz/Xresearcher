export default async function handler(req: Request) {
  const url = new URL(req.url, "http://localhost")
  const query = url.searchParams.toString()

  if (!query) {
    return new Response('Missing query params', { status: 400 })
  }

  const res = await fetch(`https://export.arxiv.org/api/query?${query}`)

  const text = await res.text()

  return new Response(text, {
    status: res.status, // 👈 important
    headers: {
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
    },
  })
}