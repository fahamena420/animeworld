import { client as axios } from '../../utils/axios-client.js';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup cache with TTL of 1 day (in seconds)
const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

// Helper function to extract episodes from a watch page
async function extractEpisodesFromWatchPage(url, seriesId, seasonNumber) {
  try {
    console.log(`Fetching episodes for season ${seasonNumber} from ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const episodes = [];
    
    // Extract episodes from the episode list section
    $('#episode_by_temp li').each((index, element) => {
      const $element = $(element);
      
      const episodeTitle = $element.find('.entry-title').text().trim();
      const episodeImage = $element.find('img').attr('src');
      const episodeLink = $element.find('a').attr('href');
      const episodeId = episodeLink ? episodeLink.split('/').pop() : '';
      const episodeNumberText = $element.find('.num-epi').text().trim();
      
      // Parse episode number (format is usually like "1x1" for season 1 episode 1)
      let epSeasonNumber = seasonNumber;
      let episodeNumber = index + 1;
      
      if (episodeNumberText) {
        const parts = episodeNumberText.split('x');
        if (parts.length === 2) {
          epSeasonNumber = parseInt(parts[0]);
          episodeNumber = parseInt(parts[1]);
        }
      }
      
      if (episodeId) {
        episodes.push({
          id: episodeId,
          title: episodeTitle,
          image: episodeImage,
          seasonNumber: epSeasonNumber,
          episodeNumber: episodeNumber,
          number: episodeNumberText || `${epSeasonNumber}x${episodeNumber}`,
          url: episodeLink
        });
      }
    });
    
    console.log(`Found ${episodes.length} episodes for season ${seasonNumber}`);
    return episodes;
  } catch (error) {
    console.error(`Error extracting episodes from ${url}:`, error.message);
    return [];
  }
}

// Function to load series data from JSON files
async function loadSeriesFromJson(id) {
  try {
    // Check if this is a special series with a JSON file
    const jsonPath = path.join(__dirname, '../../../json', `${id}.json`);
    
    // Check if the JSON file exists
    if (fs.existsSync(jsonPath)) {
      console.log(`Loading ${id} data from JSON file`);
      const jsonData = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(jsonData);
    }
    
    return null;
  } catch (error) {
    console.error(`Error loading JSON data for ${id}:`, error.message);
    return null;
  }
}

export async function getSeriesData(id, baseUrl) {
  try {
    // Check cache first
    const cacheKey = `series_${id}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Serving cached series data for ID: ${id}`);
      return cachedData;
    }
    
    // First check if we have a JSON file for this series
    const jsonData = await loadSeriesFromJson(id);
    
    if (jsonData) {
      console.log(`Using JSON data for ${id}`);
      
      // Store in cache
      cache.set(cacheKey, jsonData);
      
      // Return the series data from JSON
      return jsonData;
    }
    
    // If no JSON file, proceed with web scraping
    console.log(`No JSON file found for ${id}, fetching from web`);
    
    // First try movies endpoint
    try {
      const movieUrl = `${baseUrl}/movies/${id}`;
      console.log(`Trying movie URL: ${movieUrl}`);
      const movieResponse = await axios.get(movieUrl);
      
      // If we get here, it's a movie
      const $ = cheerio.load(movieResponse.data);
      
      // Extract movie information
      const title = $('.entry-title').text().trim();
      const poster = $('.post-thumbnail img').attr('src');
      const rating = $('.vote').text().trim().replace('TMDB', '').trim();
      const description = $('.entry-content').text().trim();
      
      // Extract metadata
      const metadata = {};
      $('.aa-cn .aa-tb.hdd.on .entry-metadata li').each((index, element) => {
        const $element = $(element);
        const key = $element.find('b').text().trim().toLowerCase().replace(':', '');
        const value = $element.text().replace($element.find('b').text(), '').trim();
        
        if (key && value) {
          metadata[key] = value;
        }
      });
      
      // For movies, create a single episode that points to the movie player
      const movieData = {
        id,
        title,
        poster,
        rating,
        description,
        metadata,
        isMovie: true,
        totalEpisodes: 1,
        totalSeasons: 1,
        seasons: [{
          id: '1',
          number: 1,
          name: 'Movie',
          episodes: [{
            id: id + '-1x1',
            title: title,
            image: poster,
            seasonNumber: 1,
            episodeNumber: 1,
            number: '1x1',
            url: movieUrl
          }]
        }]
      };
      
      // Store in cache
      cache.set(cacheKey, movieData);
      
      // Return the movie data
      return movieData;
      
    } catch (movieError) {
      // If it's not a movie, continue with series handling
      console.log(`Not a movie (${movieError.message}), trying as series`);
    }
    
    // Construct the series URL
    const url = `${baseUrl}/series/${id}`;
    
    // Fetch series data
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extract series information
    const title = $('.entry-title').text().trim();
    const poster = $('.post-thumbnail img').attr('src');
    const rating = $('.vote').text().trim().replace('TMDB', '').trim();
    const description = $('.entry-content').text().trim();
    
    // Extract metadata
    const metadata = {};
    $('.aa-cn .aa-tb.hdd.on .entry-metadata li').each((index, element) => {
      const $element = $(element);
      const key = $element.find('b').text().trim().toLowerCase().replace(':', '');
      const value = $element.text().replace($element.find('b').text(), '').trim();
      
      if (key && value) {
        metadata[key] = value;
      }
    });
    
    // Extract seasons information
    const seasons = [];
    $('.choose-season .aa-cnt li.sel-temp').each((index, element) => {
      const $element = $(element);
      const seasonLink = $element.find('a');
      const seasonNumber = seasonLink.attr('data-season');
      const seasonId = seasonLink.attr('data-post');
      const seasonName = seasonLink.text().trim();
      
      if (seasonNumber && seasonId) {
        seasons.push({
          id: seasonId,
          number: parseInt(seasonNumber),
          name: seasonName
        });
      }
    });
    
    // If no seasons found, create a default season
    if (seasons.length === 0) {
      seasons.push({
        id: '1',
        number: 1,
        name: 'Season 1'
      });
    }
    
    console.log(`Found ${seasons.length} seasons for ${id}`);
    
    // Regular handling for series - fetch episodes for each season in parallel
    const seasonEpisodePromises = seasons.map(async (season) => {
      // Construct the URL for the first episode of this season
      const watchUrl = `${baseUrl}/episode/${id}-${season.number}x1`;
      
      try {
        // Fetch episodes for this season
        const seasonEpisodes = await extractEpisodesFromWatchPage(watchUrl, id, season.number);
        
        // Add episodes to the season object
        season.episodes = seasonEpisodes;
        return seasonEpisodes;
      } catch (error) {
        console.error(`Error fetching episodes for season ${season.number}:`, error.message);
        season.episodes = [];
        return [];
      }
    });
    
    // Wait for all episode fetches to complete
    const allSeasonEpisodes = await Promise.all(seasonEpisodePromises);
    
    // Flatten all episodes for backward compatibility
    const allEpisodes = allSeasonEpisodes.flat();
    
    const seriesData = {
      id,
      title,
      poster,
      rating,
      description,
      metadata,
      seasons,
      totalEpisodes: allEpisodes.length,
      totalSeasons: seasons.length
    };
    
    // Store in cache
    cache.set(cacheKey, seriesData);
    
    return seriesData;
  } catch (error) {
    console.error(`Error in getSeriesData for ID ${id}:`, error.message);
    throw error;
  }
}

export async function getSeasonData(seriesId, seasonNumber, baseUrl) {
  try {
    // Check cache first
    const cacheKey = `series_${seriesId}_season_${seasonNumber}`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Serving cached season data for ID: ${seriesId}, Season: ${seasonNumber}`);
      return cachedData;
    }
    
    // First get the series data
    const seriesData = await getSeriesData(seriesId, baseUrl);
    
    // If it's a movie, return the movie data as the only season
    if (seriesData.isMovie) {
      return seriesData.seasons[0];
    }
    
    // Find the requested season
    const season = seriesData.seasons.find(s => s.number === parseInt(seasonNumber));
    
    if (!season) {
      throw new Error(`Season ${seasonNumber} not found for series ${seriesId}`);
    }
    
    // Store in cache
    cache.set(cacheKey, season);
    
    return season;
  } catch (error) {
    console.error(`Error in getSeasonData for ID ${seriesId}, Season: ${seasonNumber}:`, error.message);
    throw error;
  }
}
