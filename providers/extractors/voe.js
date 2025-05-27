"use strict";

import axios from 'axios';
import { load } from 'cheerio';
import { VideoExtractor } from '../models/index.js';

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function replacePatterns(str) {
  const patterns = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
  for (const pattern of patterns) {
    str = str.split(pattern).join('_');
  }
  return str;
}

function removeUnderscores(str) {
  return str.replace(/_/g, '');
}

function charShift(str, shift) {
  return str
    .split('')
    .map(c => String.fromCharCode(c.charCodeAt(0) - shift))
    .join('');
}

function decryptF7(p8) {
  try {
    const step1 = rot13(p8);
    const step2 = replacePatterns(step1);
    const step3 = removeUnderscores(step2);
    const step4 = Buffer.from(step3, 'base64').toString();
    const step5 = charShift(step4, 3);
    const step6 = step5.split('').reverse().join('');
    const finalJson = Buffer.from(step6, 'base64').toString();
    return JSON.parse(finalJson);
  } catch (e) {
    console.error('[Voe] Decryption failed:', e.message);
    return {};
  }
}

class Voe extends VideoExtractor {
  constructor() {
    super();
    this.serverName = 'voe';
    this.sources = [];
    this.domains = ['voe.sx'];
    this.client = axios.create();
  }

  async extract(videoUrl) {
    try {
      if (!(videoUrl instanceof URL)) {
        videoUrl = new URL(videoUrl);
      }

      let res = await this.client.get(videoUrl.href);
      const redirectMatch = res.data.match(/window\.location\.href\s*=\s*'([^']+)'/);
      if (redirectMatch) {
        res = await this.client.get(redirectMatch[1]);
      }

      const $ = load(res.data);
      const encodedScript = $('script[type="application/json"]').html();
      const encodedMatch = encodedScript
        ? encodedScript.trim().match(/\["([^"]+)"\]/)
        : null;

      if (!encodedMatch || !encodedMatch[1]) {
        throw new Error('Could not find video URL');
      }

      const decrypted = decryptF7(encodedMatch[1]);

      const subtitles = [];

      if (decrypted.tracks && Array.isArray(decrypted.tracks)) {
        for (const track of decrypted.tracks) {
          if (track && track.file && track.label) {
            subtitles.push({
              lang: track.label,
              url: track.file.startsWith('http') ? track.file : new URL(track.file, videoUrl.origin).href,
            });
          }
        }
      }

      const m3u8 = decrypted.source;
      const mp4 = decrypted.direct_access_url;

      if (m3u8) {
        this.sources.push({
          url: m3u8,
          quality: 'HLS',
          isM3U8: true,
        });
      }

      if (mp4) {
        this.sources.push({
          url: mp4,
          quality: 'MP4',
          isM3U8: false,
        });
      }

      if (this.sources.length === 0) {
        throw new Error('Could not find video URL');
      }

      return {
        sources: this.sources,
        subtitles: subtitles,
      };
    } catch (err) {
      console.error('[Voe] Extraction failed:', err);
      throw new Error(err.message);
    }
  }
}

export async function extractVoeSources(url) {
  const voe = new Voe();
  return await voe.extract(new URL(url));
}
