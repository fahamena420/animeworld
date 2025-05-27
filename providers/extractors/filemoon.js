"use strict";

import axios from 'axios';
import { load } from 'cheerio';
import { VideoExtractor } from '../models/index.js';
import { USER_AGENT } from '../utils/constants.js';

/**
 * Filemoon video extractor
 */
class Filemoon extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'Filemoon';
    this.sources = [];
    this.host = 'https://filemoon.sx';
    this.client = axios.create();
  }

  async extract(videoUrl) {
    if (!(videoUrl instanceof URL)) {
      videoUrl = new URL(videoUrl);
    }

    const options = {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'file_id=40342338; aff=23788; ref_url=https%3A%2F%2Fbf0skv.org%2Fe%2Fm0507zf4xqor; lang=1',
        Priority: 'u=0, i',
        Referer: videoUrl.origin,
        Origin: videoUrl.href,
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'iframe',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': USER_AGENT,
        'Access-Control-Allow-Origin': '*',
      },
    };

    try {
      const { data } = await this.client.get(videoUrl.href, options);
      const $ = load(data);
      const iframeSrc = $('iframe').attr('src');
      
      if (!iframeSrc) {
        throw new Error('No iframe found on the page');
      }

      const { data: iframeData } = await this.client.get(iframeSrc.startsWith('http') ? iframeSrc : new URL(iframeSrc, videoUrl.origin).href, options);
      const unpackedData = eval(/(eval)(\(f.*?)(\n<\/script>)/s.exec(iframeData)[2].replace('eval', ''));
      const links = unpackedData.match(new RegExp('sources:\\[\\{file:"(.*?)"')) ?? [];
      const m3u8Link = links[1];

      this.sources = [{
        url: m3u8Link,
        quality: 'auto',
        isM3U8: true,
      }];

      return {
        success: true,
        server: 4,
        name: 'FileMoon',
        url: videoUrl.href,
        sources: this.sources
      };

    } catch (error) {
      console.error('Filemoon extraction error:', error.message);
      return {
        success: true,
        server: 4,
        name: 'FileMoon',
        url: videoUrl?.href || videoUrl,
        sources: [{
          quality: 'unknown',
          url: videoUrl?.href || videoUrl
        }]
      };
    }
  }
}

// Create a default instance for the default export
const filemoon = new Filemoon();

// Named export that matches what server.js is expecting
export async function extractFilemoonSources(url) {
  try {
    const result = await filemoon.extract(url);
    return result;
  } catch (error) {
    console.error('Error in extractFilemoonSources:', error);
    return {
      success: true,
      server: 4,
      name: 'FileMoon',
      url: url,
      sources: [{
        quality: 'unknown',
        url: url
      }]
    };
  }
}

// Keep the default export for backward compatibility
export default Filemoon;