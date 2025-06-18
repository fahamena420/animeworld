import { client as axios } from '../../utils/axios-client.js';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

// Setup cache with TTL of 7 days (in seconds)
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 * 7 });

export async function extractPlayerData(id, baseUrl) {
  try {
    // Check cache first
    const cacheKey = `player_${id}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Serving cached player data for ID: ${id}`);
      return cachedData;
    }

    let url, playerData;
    
    // First try the episode URL
    try {
      url = `${baseUrl}/episode/${id}`;
      playerData = await extractPlayerDataFromUrl(url);
    } catch (episodeError) {
      console.log(`Episode URL failed, trying movie URL for ID: ${id}`);
      // If episode URL fails, try the movie URL
      try {
        url = `${baseUrl}/movies/${id}`;
        playerData = await extractPlayerDataFromUrl(url);
      } catch (movieError) {
        console.error(`Both episode and movie URLs failed for ID: ${id}`);
        throw new Error('Content not found at episode or movie URL');
      }
    }
    
    // Store in cache
    cache.set(cacheKey, playerData);
    
    return playerData;
  } catch (error) {
    console.error(`Error extracting player data for ID ${id}:`, error.message);
    throw error;
  }
}

async function extractPlayerDataFromUrl(url) {
  // Fetch the page content
  const response = await axios.get(url);
  if (response.status !== 200) {
    throw new Error('Failed to fetch content');
  }

  const $ = cheerio.load(response.data);
  
  // Find all iframe elements in the video player section
  const iframeElements = $('.video-player .video iframe');
  if (!iframeElements.length) {
    throw new Error('No iframe found');
  }

  // Get the main iframe source (the first one that's active)
  const mainIframe = $('.video-player .video.on iframe').first();
  const iframeSrc = mainIframe.attr('src') || mainIframe.attr('data-src');
  
  if (!iframeSrc) {
    throw new Error('No iframe source found');
  }

  // Extract all server options and their corresponding iframe sources
  const servers = [];
  const sources = [];
  
  // Get all server options from the sidebar
  $('.aa-tbs-video li').each((index, element) => {
    const $element = $(element);
    const serverName = $element.text().trim();
    const serverClass = $element.attr('class') || '';
    const isActive = serverClass.includes('on');
    
    // Extract the server name part (after SERVER X)
    let serverNamePart = '';
    if (serverName.includes('\n')) {
      serverNamePart = serverName.split('\n')[1].trim();
    } else if (serverName.includes('SERVER')) {
      serverNamePart = serverName.replace(/SERVER\s+\d+/i, '').trim();
    }
    
    // Find the corresponding iframe for this server
    const iframeElement = $(`#options-${index} iframe`);
    const serverSrc = iframeElement.attr('src') || iframeElement.attr('data-src');
    
    if (serverSrc) {
      sources.push({
        server: index + 1,
        src: serverSrc
      });
    }
    
    servers.push({
      name: serverName,
      active: isActive
    });
  });

  // If no servers were found in the sidebar, try to extract them directly from the video divs
  if (servers.length === 0) {
    $('.video-player .video').each((index, element) => {
      const $element = $(element);
      const isActive = $element.hasClass('on');
      const iframeElement = $element.find('iframe');
      const serverSrc = iframeElement.attr('src') || iframeElement.attr('data-src');
      
      if (serverSrc) {
        sources.push({
          server: index + 1,
          src: serverSrc
        });
        
        servers.push({
          name: `SERVER ${index + 1}`,
          active: isActive
        });
      }
    });
  }

  // Add server names to sources from the servers array
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const serverNumber = source.server;
    
    // Find the corresponding server in the servers array
    const server = servers.find(s => s.name.includes(`SERVER ${serverNumber}`));
    
    if (server) {
      // Extract the server name part (after SERVER X)
      let serverNamePart = '';
      if (server.name.includes('\n')) {
        const parts = server.name.split('\n');
        if (parts.length > 1) {
          serverNamePart = parts[1].trim();
        }
      }
      
      // Add the name to the source
      source.name = serverNamePart || `Server ${serverNumber}`;
    } else {
      source.name = `Server ${serverNumber}`;
    }
  }

  return {
    iframe: iframeSrc,
    sources: sources,
    servers: servers
  };
}
