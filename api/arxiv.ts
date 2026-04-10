export default async function handler(req: Request) {
  // 1. Safely extract the query string from the incoming request
  // We use the 'url' property and provide a dummy base to satisfy the constructor
  const { searchParams } = new URL(req.url, 'http://n.n');
  const queryString = searchParams.toString();

  if (!queryString) {
    return new Response('Missing query parameters', { status: 400 });
  }

  // 2. Build the target arXiv URL
  const targetUrl = `https://export.arxiv.org/api/query?${queryString}`;

  try {
    // 3. Set a reasonable timeout for the internal fetch
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 25000); // 25s limit

    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(id);

    const text = await res.text();

    return new Response(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate', // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return new Response(
      error.name === 'AbortError' ? 'arXiv API timed out' : 'Internal Server Error', 
      { status: error.name === 'AbortError' ? 504 : 500 }
    );
  }
}