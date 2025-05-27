import axios from 'axios';
import NodeCache from 'node-cache';
import { extractPlayerData } from './player.js';

// Import extractors for various streaming providers
import { extractStreamWishSources } from '../../extractors/streamwish.js';
import { extractFilemoonSources } from '../../extractors/filemoon.js';
import { extractVidxDubSources } from '../../extractors/vidxdub.js';
import { extractVoeSources } from '../../extractors/voe.js';

// Setup cache with TTL of 7 days (in seconds)
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 * 7 });

export async function extractSource(id, serverName, baseUrl) {
  try {
    // Check cache first
    const cacheKey = `source_${id}_${serverName}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Serving cached source data for ID: ${id}, Server: ${serverName}`);
      return cachedData;
    }

    // First determine if this is a movie or episode by checking the URL directly
    let url;
    let contentType = cache.get(`content_type_${id}`);
    
    if (!contentType) {
      try {
        // Try episode URL first
        await axios.head(`${baseUrl}/episode/${id}`);
        contentType = 'episode';
      } catch (episodeError) {
        try {
          // If episode fails, try movie URL
          await axios.head(`${baseUrl}/movies/${id}`);
          contentType = 'movie';
        } catch (movieError) {
          console.error(`Failed to determine content type for ID: ${id}`);
          throw new Error('Content not found at episode or movie URL');
        }
      }
      cache.set(`content_type_${id}`, contentType);
    }
    
    // Set the correct URL based on content type
    url = contentType === 'movie' 
      ? `${baseUrl}/movies/${id}` 
      : `${baseUrl}/episode/${id}`;
    
    // Fetch the player data with the correct URL
    const playerData = await extractPlayerData(id, baseUrl);
    
    if (!playerData || !playerData.sources || playerData.sources.length === 0) {
      throw new Error('No sources found for this content');
    }
    
    // Find the server by name (case-insensitive)
    const serverNameLower = serverName.toLowerCase();
    let sourceData = playerData.sources.find(s => 
      s.name && s.name.toLowerCase() === serverNameLower
    );
    
    if (!sourceData) {
      // If not found by name, try to match by server number as fallback
      const serverNumber = parseInt(serverName);
      if (!isNaN(serverNumber)) {
        sourceData = playerData.sources.find(s => s.server === serverNumber);
      }
      
      if (!sourceData) {
        throw new Error(`Server "${serverName}" not found for this content`);
      }
    }

    const sourceUrl = sourceData.src;
    const sourceDisplayName = sourceData.name || `Server ${sourceData.server || ''}`.trim();
    
    let extractedData = null;
    
    // Determine which extractor to use based on the server name
    try {
      let sources = [];
      
      if (serverNameLower.includes('deadtoons') || serverNameLower.includes('my server')) {
        console.log(`Using VidxDub extractor for deadtoons URL: ${sourceUrl}`);
        const result = await extractVidxDubSources(sourceUrl);
        sources = result.sources || [];
      } 
      else if (serverNameLower.includes('filemoon') || serverNameLower.includes('moon')) {
        console.log(`Using Filemoon extractor for ${sourceUrl}`);
        const result = await extractFilemoonSources(sourceUrl);
        sources = result.sources || [];
      } 
      else if (serverNameLower.includes('streamwish') || serverNameLower.includes('cybervynx') || 
               serverNameLower.includes('earnvids') || serverNameLower.includes('smoothpre') ||
               serverNameLower.includes('wish')) {
        console.log(`Using StreamWish extractor for ${sourceUrl}`);
        const result = await extractStreamWishSources(sourceUrl);
        sources = result.sources || [];
      } 
      else if (serverNameLower.includes('voe')) {
        console.log(`Using Voe extractor for ${sourceUrl}`);
        const result = await extractVoeSources(sourceUrl);
        sources = result.sources || [];
      } 
      else if (serverNameLower.includes('abyss') || serverNameLower.includes('short.icu')) {
        console.log(`Using generic extractor for Abyss: ${sourceUrl}`);
        sources = [{ quality: 'auto', url: sourceUrl }];
      }
      else {
        // Default handler for unknown servers
        console.log(`No specific extractor found for ${serverName}, using generic handler`);
        sources = [{ quality: 'auto', url: sourceUrl }];
      }
      
      extractedData = { sources };
    } catch (error) {
      console.error(`Error during extraction for ${sourceUrl}:`, error.message);
      // Continue to the fallback response below
    }
    
    const result = {
      success: true,
      server: sourceData.server || 0,
      name: sourceDisplayName,
      url: sourceUrl,
      sources: (extractedData && extractedData.sources) ? 
               extractedData.sources : 
               [{ quality: 'auto', url: sourceUrl }]
    };
    
    // Store in cache
    cache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error(`Error in extractSource for ID ${id}:`, error.message);
    throw error;
  }
}
