// External search via a single provider (Tavily or SerpAPI).

const PROVIDER = process.env.SEARCH_API_PROVIDER ?? "none";
const SERPAPI_KEY = process.env.SEARCH_API_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY ?? process.env.SEARCH_API_KEY;

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  domain?: string;
}

export async function searchExternal(query: string, num = 5): Promise<SearchResult[] | null> {
  if (PROVIDER === "serpapi" && SERPAPI_KEY) {
    return searchSerpApi(query, num);
  }
  if (PROVIDER === "tavily" && TAVILY_KEY) {
    return searchTavily(query, num);
  }
  return null;
}

async function searchSerpApi(query: string, num: number): Promise<SearchResult[] | null> {
  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("api_key", SERPAPI_KEY!);
    url.searchParams.set("num", String(num));
    const res = await fetch(url.toString());
    const data = await res.json();
    const organic = data?.organic_results ?? [];
    return organic.slice(0, num).map((r: { title?: string; link?: string; snippet?: string }) => ({
      title: r.title ?? "",
      link: r.link ?? "",
      snippet: r.snippet ?? "",
      domain: r.link ? new URL(r.link).hostname : undefined,
    }));
  } catch (e) {
    console.error("SerpAPI error:", e);
    return null;
  }
}

async function searchTavily(query: string, num: number): Promise<SearchResult[] | null> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: "basic",
        max_results: num,
      }),
    });
    const data = await res.json();
    const results = data?.results ?? [];
    return results.map((r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      link: r.url ?? "",
      snippet: (r.content ?? "").slice(0, 200),
      domain: r.url ? new URL(r.url).hostname : undefined,
    }));
  } catch (e) {
    console.error("Tavily error:", e);
    return null;
  }
}

export function isExternalVerificationConfigured(): boolean {
  return (
    (PROVIDER === "serpapi" && !!SERPAPI_KEY) ||
    (PROVIDER === "tavily" && !!TAVILY_KEY)
  );
}
