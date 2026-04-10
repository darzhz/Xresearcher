export const runtime = 'edge'

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const query = url.searchParams.toString()

  const res = await fetch(`https://export.arxiv.org/api/query?${query}`)
  const text = await res.text()

  return new Response(text, {
    headers: {
      'Content-Type': 'application/xml',
      'Access-Control-Allow-Origin': '*',
    },
  })
}