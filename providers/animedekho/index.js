import axios from 'axios';
import { load } from 'cheerio';

const animedekhoAxios = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://animedekho.co/'
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

      const embedUrl = `${this.baseUrl}/embed/${tmdbId}/${season}-${episode}`;
      
      // First, get the embed page to find the iframe source
      const embedResponse = await animedekhoAxios.get(embedUrl);
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
