import axios from 'axios';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

// Setup cache with TTL of 1 day (in seconds)
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

export async function searchContent(query, baseUrl) {
  try {
    if (!query) {
      throw new Error('Search query is required');
    }
    
    // Check cache first
    const cacheKey = `search_${query}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Serving cached search results for query: ${query}`);
      return cachedData;
    }
    
    // Construct the URL
    const url = `${baseUrl}/?s=${encodeURIComponent(query)}`;
    
    // Fetch search results
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const searchResults = [];
    
    // Extract search results
    $('.post-lst li').each((index, element) => {
      const $element = $(element);
      
      const title = $element.find('.entry-title').text().trim();
      const rating = $element.find('.vote').text().trim().replace('TMDB', '').trim();
      let poster = $element.find('img').attr('src');
      
      // Extract the series ID from the URL
      const linkElement = $element.find('a');
      const href = linkElement.attr('href');
      const id = href ? href.split('/').pop() : '';
      
      if (id && title) {
        searchResults.push({
          id,
          title,
          rating,
          poster,
          url: href
        });
      }
    });
    
    // Store in cache
    cache.set(cacheKey, searchResults);
    
    return searchResults;
  } catch (error) {
    console.error('Error in searchContent:', error.message);
    throw error;
  }
}
