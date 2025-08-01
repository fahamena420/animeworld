import axios from 'axios';
import { load } from 'cheerio';

// Check for a proxy URL from environment variables
const proxyUrl = process.env.PROXY_URL;

// This client instance is now just for default headers
export const client = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://animedekho.co/',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  }
});

export class AnimeDekho {
  constructor(baseUrl = 'https://animedekho.co') {
    this.baseUrl = baseUrl;
  }

  async getSource(id, serverName = 'default') {
    try {
      // id is expected to be in format: {tmdbId}-{season}x{episode}
      const [tmdbId, seasonEpisode] = id.split('-');
      const [season, episode] = seasonEpisode.split('x');

      const relativeEmbedUrl = `/embed/${tmdbId}/${season}-${episode}`;
      const fullEmbedUrl = this.baseUrl + relativeEmbedUrl;

      // Prepend the proxy to the full URL if it's set
      const requestUrl = proxyUrl ? `${proxyUrl}${fullEmbedUrl}` : fullEmbedUrl;
      
      // First, get the embed page to find the iframe source
      const embedResponse = await axios.get(requestUrl, { headers: client.defaults.headers });
      const $ = load(embedResponse.data);
      const iframeSrc = $('iframe').attr('src');

      if (!iframeSrc || !iframeSrc.includes('play.zephyrflick.top/video/')) {
        throw new Error('Player iframe source not found or invalid on AnimeDekho');
      }

      // Extract the video ID from the iframe source URL
      const videoId = iframeSrc.split('/video/')[1];

      // Construct the API URL to get the actual video source
      const apiUrl = `https://play.zephyrflick.top/player/index.php?data=${videoId}&do=getVideo`;

      // Fetch the video source JSON from the API using a POST request
      const videoSourceResponse = await axios.post(apiUrl, null, {
        headers: {
          'Referer': iframeSrc,
          'Origin': 'https://play.zephyrflick.top',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      });

      const videoData = videoSourceResponse.data;

      if (!videoData || !videoData.videoSource) {
        throw new Error('Video source not found in the API response from play.zephyrflick.top');
      }

      const sources = [];
      if (videoData.securedLink) {
        sources.push({ url: videoData.securedLink, isDASH: false, isHLS: true, quality: 'secured' });
      }
      if (videoData.videoSource) {
        sources.push({ url: videoData.videoSource, isDASH: false, isHLS: true, quality: 'default' });
      }

      return {
        headers: { Referer: 'https://play.zephyrflick.top/' },
        thumbnail: videoData.videoImage || '',
        sources: sources,
      };

    } catch (error) {
      console.error('Error fetching source from AnimeDekho:', error.message);
      return null;
    }
  }
}
