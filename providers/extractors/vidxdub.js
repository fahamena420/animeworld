import axios from 'axios';
import { VideoExtractor } from '../models/index.js';
import { USER_AGENT } from '../utils/constants.js';
import { URL } from 'url';
import { AesHelper } from '../utils/aes-helper.js';

class VidxDub extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'VidxDub';
    this.sources = [];
    this.host = 'https://vidxdub.rpmvid.com';
    this.client = axios.create();
    this.subtitleDomain = 'server1.uns.bio';
    this.aesKey = 'kiemtienmua911ca';
    this.aesIv = '0123456789abcdef';
  }

  getBaseUrl(url) {
    try {
      const parsedUrl = new URL(url);
      return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    } catch (e) {
      return this.host;
    }
  }

  extractVideoId(url) {
    try {
      const cleanUrl = url.toString().trim();
      const urlObj = new URL(cleanUrl);
      let id = urlObj.hash ? urlObj.hash.replace('#', '') : null;
      
      if (!id) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        id = pathParts[pathParts.length - 1];
      }

      id = (id || '').trim();
      if (!id || id === '/') {
        throw new Error('No video ID found in URL');
      }

      return id;
    } catch (err) {
      throw new Error(`Failed to extract video ID: ${err.message}`);
    }
  }

  cleanDecryptedText(text) {
    try {
      const sourceMatch = text.match(/"source":"(https?:\/\/[^/]+)/i);
      const domain = sourceMatch ? sourceMatch[1] : `https://${this.subtitleDomain}`;
      const jsonStart = text.indexOf('{');
      
      if (jsonStart === -1) {
        throw new Error('No JSON object found');
      }

      const jsonText = text.substring(jsonStart);
      const parsed = JSON.parse(jsonText);
      parsed._subtitleDomain = domain;
      
      if (parsed.cf) {
        parsed.cf = parsed.cf.replace(/\\\//g, '/');
      }
      
      return parsed;
    } catch (error) {
      const cfMatch = text.match(/"cf":"([^"]+)"/);
      const sourceMatch = text.match(/"source":"(https?:\/\/[^/]+)/i);
      const domain = sourceMatch ? sourceMatch[1] : `https://${this.subtitleDomain}`;
      const subtitleMatch = text.match(/"subtitle":\s*({[^}]+})/);
      
      const result = { _subtitleDomain: domain };
      
      if (cfMatch?.[1]) {
        result.cf = cfMatch[1].replace(/\\\//g, '/');
      }
      
      if (subtitleMatch?.[1]) {
        try {
          const cleanSubtitle = subtitleMatch[1]
            .replace(/([{\[,])\s*([a-zA-Z0-9_]+?):/g, '$1"$2":')
            .replace(/:([^"\s]+)([,\]}])/g, ':"$1"$2');
          result.subtitle = JSON.parse(cleanSubtitle);
        } catch (e) {
          console.error('Failed to parse subtitles');
        }
      }
      
      if (!result.cf) {
        throw new Error('No valid data found');
      }
      
      return result;
    }
  }

  async extract(videoUrl) {
    try {
      const id = this.extractVideoId(videoUrl);
      const baseUrl = this.getBaseUrl(videoUrl);
      const response = {
        sources: [],
        subtitles: []
      };

      const { data: encoded } = await this.client.get(
        `${baseUrl}/api/v1/video?id=${id}`,
        { headers: { 'User-Agent': USER_AGENT, 'Referer': videoUrl.toString() } }
      );

      const decryptedText = AesHelper.decryptAES(encoded.trim(), this.aesKey, this.aesIv);
      const videoData = this.cleanDecryptedText(decryptedText);

      if (videoData.cf) {
        const videoUrl = videoData.cf.replace(/\\\//g, '/');
        response.sources.push({
          url: videoUrl,
          quality: 'auto',
          isM3U8: videoUrl.includes('.m3u8')
        });
      }

      if (videoData.subtitle && typeof videoData.subtitle === 'object') {
        const domain = videoData._subtitleDomain || `https://${this.subtitleDomain}`;
        
        for (const [language, path] of Object.entries(videoData.subtitle)) {
          if (path && typeof path === 'string') {
            const cleanPath = path.split('#')[0];
            const subtitleUrl = cleanPath.startsWith('http') 
              ? cleanPath 
              : `${domain}${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
            
            response.subtitles.push({ url: subtitleUrl, lang: language });
          }
        }
      }

      return { sources: response };
    } catch (err) {
      console.error('[VidxDub] Extraction failed:', err.message);
      throw err;
    }
  }
}

export async function extractVidxDubSources(url) {
  const vidxdub = new VidxDub();
  return await vidxdub.extract(new URL(url));
}