export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

// Default HTTP headers to mimic a real browser request when scraping AnimeWorld India.
// Some HTTP/2 pseudo-headers (those starting with ":") are omitted because Axios/Node
// will drop them anyway. These headers improve compatibility on Vercel deployments.
export const DEFAULT_REQUEST_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'max-age=0',
  Cookie: 'cf_clearance=JXqKSO3fH4bT53.GkWPPxBINrI8P4c6bAHrWcY00jw8-1750261597-1.2.1.1-_b5icX0bNOursCx_Ap.ARpErnxeuwlScfg3lnjVjEEWAjtTfLteo5CBNnO76YsBVPmF5ZxFckbjRipkWqiz_TWw.YUZPVDDMx0YoC0JOQoNQGlcKPGdJvcMp8kx8np_TtwjzVmsx5hLh6hcB5jaVY2ShVwg95ywozJDvChcjTfhfMf7wNjlj_AXZKpoRqbBVfhGPGfq8xBgHveYtlkLl8BOn4PtbqaZIO8kB8LpidhwhmesY3Yr8lkTDjr0BXOvLOLehiUKnguzPPq2n3t5lmXeTto5JDDzWb5hvup.S6SpuTQBx0j9ypVZrQcUSysB34deMAr4p0_GOpXD10KV41A1QdF2I0n.h3lV.mOokziY',
  Priority: 'u=0, i',
  Referer: 'https://animeworld-india.me/?s=naruto',
  'Sec-Ch-Ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'User-Agent': USER_AGENT,
};
