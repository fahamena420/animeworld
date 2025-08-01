import axios from 'axios';
import { load } from 'cheerio';

// Configure axios with default headers for satoru.one
const satoruAxios = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.satoru.one/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  }
});

// Helper to extract m3u8 link from a specific iframe URL
async function extractM3u8FromIframe(iframeUrl) {
  try {
    const { data: html } = await satoruAxios.get(iframeUrl);
    const m3u8Match = html.match(/const\s+mastreUrl\s*=\s*['"]([^'"]+\.m3u8)['"]/);
    if (m3u8Match && m3u8Match[1]) {
      return m3u8Match[1];
    }
    return null;
  } catch (error) {
    console.error(`Error extracting m3u8 from ${iframeUrl}:`, error.message);
    return null;
  }
}

export class Satoru {
  constructor(baseUrl = 'https://www.satoru.one') {
    this.baseUrl = baseUrl;
  }

  // Search for an anime and return its satoru ID
  async search(title) {
    try {
      const searchUrl = `${this.baseUrl}/filter?keyword=${encodeURIComponent(title)}`;
      const { data: html } = await satoruAxios.get(searchUrl);
      const $ = load(html);

      const searchResults = [];
      $('div.flw-item').each((i, el) => {
        const item = $(el);
        const id = item.find('a.film-poster-ahref').attr('data-id');
        const resultTitle = item.find('h3.film-name a').attr('title');
        if (id && resultTitle) {
          searchResults.push({ id, title: resultTitle });
        }
      });

      return searchResults;
    } catch (error) {
      console.error('Error searching on Satoru:', error.message);
      return [];
    }
  }

  // Get video sources for a given episode
  async getSource(id, serverName, episodeNum) {
    try {
      // 1. Get episode list
      const episodeListUrl = `${this.baseUrl}/ajax/episode/list/${id}`;
      const { data: episodeListData } = await satoruAxios.get(episodeListUrl);
      const $episodes = load(episodeListData.html);
      const episodeLink = $episodes(`a.ssl-item[data-number='${episodeNum}']`);

      if (!episodeLink.length) {
        throw new Error(`Episode ${episodeNum} not found.`);
      }

      const episodeId = episodeLink.attr('data-id');

      // 2. Get server list for the episode
      const serverListUrl = `${this.baseUrl}/ajax/episode/servers?episodeId=${episodeId}`;
      const { data: serverListData } = await satoruAxios.get(serverListUrl);
      const $servers = load(serverListData.html);

      const sources = [];
      const serverPromises = [];

      $servers('div.server-item').each((i, el) => {
        const serverItem = $servers(el);
        const serverId = serverItem.attr('data-id');
        const serverName = serverItem.text().trim();
        const sourceUrl = `${this.baseUrl}/ajax/episode/sources?id=${serverId}`;

        serverPromises.push(
          satoruAxios.get(sourceUrl).then(async ({ data: sourceData }) => {
            if (sourceData && sourceData.link && sourceData.link.includes('cdn.buycodeonline.com')) {
              let finalUrl = sourceData.link;
              // If the source is an iframe, try to extract the direct m3u8 link
              if (sourceData.type === 'iframe') {
                const extractedUrl = await extractM3u8FromIframe(finalUrl);
                if (extractedUrl) {
                  finalUrl = extractedUrl;
                }
              }
              sources.push({ url: finalUrl, quality: serverName, isHLS: finalUrl.includes('.m3u8') });
            }
          }).catch(err => {
            console.error(`Failed to fetch source from server ${serverName}:`, err.message);
          })
        );
      });

      await Promise.all(serverPromises);

      // Filter for HLS sources only
      const hlsSources = sources.filter(s => s.isHLS);

      return { sources: hlsSources };

    } catch (error) {
      console.error('Error getting source from Satoru:', error.message);
      return null;
    }
  }
}
