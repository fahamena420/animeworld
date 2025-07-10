import express from 'express';
import axios from 'axios';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score to consider a match valid

// Helper function to calculate string similarity (Levenshtein distance)
function stringSimilarity(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;
  
  // Return similarity score (1 is perfect match, 0 is completely different)
  return 1.0 - (costs[s2.length] / maxLength);
}

// Helper function to search and get best matching result ID
async function searchAndGetFirstId(query) {
  try {
    const searchResults = await animeProvider.search(query);
    if (!searchResults || searchResults.length === 0) {
      return null;
    }
    
    // Find the result with highest similarity to the query
    let bestMatch = searchResults[0];
    let highestSimilarity = stringSimilarity(query, searchResults[0].title);
    
    for (let i = 1; i < searchResults.length; i++) {
      const similarity = stringSimilarity(query, searchResults[i].title);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = searchResults[i];
      }
    }
    
    // Check if the best match meets our minimum similarity threshold
    if (highestSimilarity < SIMILARITY_THRESHOLD) {
      console.log(`Best match for "${query}" has low similarity score (${highestSimilarity.toFixed(2)}), falling back to exact ID match`);
      
      // Try to find an exact match by ID (for cases where the ID is part of the URL)
      const exactIdMatch = searchResults.find(result => result.id === query);
      if (exactIdMatch) {
        console.log(`Found exact ID match for "${query}": "${exactIdMatch.title}" (ID: ${exactIdMatch.id})`);
        return exactIdMatch.id;
      }
      
      // If no exact ID match, try to find a result whose ID contains the query
      const idContainsMatch = searchResults.find(result => result.id.includes(query));
      if (idContainsMatch) {
        console.log(`Found ID contains match for "${query}": "${idContainsMatch.title}" (ID: ${idContainsMatch.id})`);
        return idContainsMatch.id;
      }
    }
    
    console.log(`Best match for "${query}": "${bestMatch.title}" (ID: ${bestMatch.id}) with similarity score: ${highestSimilarity.toFixed(2)}`);
    return bestMatch.id;
  } catch (error) {
    console.error('Error in searchAndGetFirstId:', error);
    return null;
  }
}

// Route to get source for TMDB TV show
router.get('/:tmdbId/:seasonNum/:episodeNum/server/:serverName', async (req, res) => {
  try {
    const { tmdbId, seasonNum, episodeNum, serverName } = req.params;
    
    // First, get the show name from TMDB
    const tmdbResponse = await axios.get(
      `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`
    );
    
    if (!tmdbResponse.data || !tmdbResponse.data.name) {
      return res.status(404).json({ 
        success: false,
        error: 'TV show not found on TMDB'
      });
    }
    
    const showName = tmdbResponse.data.name;
    
    // Search for the show in our provider
    const searchResults = await animeProvider.search(showName);
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: `No results found for "${showName}" in the provider`
      });
    }
    
    // Find the best matching result
    let bestMatch = searchResults[0];
    let highestSimilarity = stringSimilarity(showName, searchResults[0].title);
    
    for (let i = 1; i < searchResults.length; i++) {
      const similarity = stringSimilarity(showName, searchResults[i].title);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = searchResults[i];
      }
    }
    
    let showId = bestMatch.id;
    
    // Check if the best match meets our minimum similarity threshold
    if (highestSimilarity < SIMILARITY_THRESHOLD) {
      console.log(`Best match for "${showName}" has low similarity score (${highestSimilarity.toFixed(2)}), checking alternatives`);
      
      // Try to find an exact match by ID (for cases where the ID is part of the URL)
      const exactIdMatch = searchResults.find(result => result.id === showName.toLowerCase().replace(/\s+/g, '-'));
      if (exactIdMatch) {
        console.log(`Found exact ID match for "${showName}": "${exactIdMatch.title}" (ID: ${exactIdMatch.id})`);
        showId = exactIdMatch.id;
      } else {
        // If no exact ID match, try to find a result whose ID contains the query
        const idContainsMatch = searchResults.find(result => 
          result.id.includes(showName.toLowerCase().replace(/\s+/g, '-')));
        if (idContainsMatch) {
          console.log(`Found ID contains match for "${showName}": "${idContainsMatch.title}" (ID: ${idContainsMatch.id})`);
          showId = idContainsMatch.id;
        } else {
          console.log(`Using best match despite low similarity: "${bestMatch.title}" (ID: ${bestMatch.id})`);
        }
      }
    } else {
      console.log(`Best match for "${showName}": "${bestMatch.title}" (ID: ${bestMatch.id}) with similarity score: ${highestSimilarity.toFixed(2)}`);
    }
    
    // Get the source using the format: {showId}-{seasonNum}x{episodeNum}
    const episodeId = `${showId}-${seasonNum}x${episodeNum}`;
    const sourceData = await animeProvider.getSource(episodeId, serverName);
    
    res.json({
      success: true,
      tmdbId,
      showName,
      season: parseInt(seasonNum),
      episode: parseInt(episodeNum),
      providerId: showId,
      ...sourceData
    });
  } catch (error) {
    console.error('Error processing TMDB TV show request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing request',
      message: error.message,
      details: error.response?.data
    });
  }
});

// Route to get source for TMDB movie
router.get('/movie/:tmdbId/server/:serverName', async (req, res) => {
  try {
    const { tmdbId, serverName } = req.params;
    
    // First, get the movie name from TMDB
    const tmdbResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`
    );
    
    if (!tmdbResponse.data || !tmdbResponse.data.title) {
      return res.status(404).json({ 
        success: false,
        error: 'Movie not found on TMDB'
      });
    }
    
    const movieTitle = tmdbResponse.data.title;
    
    // Search for the movie in our provider
    const searchResults = await animeProvider.search(movieTitle);
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: `No results found for "${movieTitle}" in the provider`
      });
    }
    
    // Find the best matching result
    let bestMatch = searchResults[0];
    let highestSimilarity = stringSimilarity(movieTitle, searchResults[0].title);
    
    for (let i = 1; i < searchResults.length; i++) {
      const similarity = stringSimilarity(movieTitle, searchResults[i].title);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = searchResults[i];
      }
    }
    
    let movieId = bestMatch.id;
    
    // Check if the best match meets our minimum similarity threshold
    if (highestSimilarity < SIMILARITY_THRESHOLD) {
      console.log(`Best match for "${movieTitle}" has low similarity score (${highestSimilarity.toFixed(2)}), checking alternatives`);
      
      // Try to find an exact match by ID (for cases where the ID is part of the URL)
      const exactIdMatch = searchResults.find(result => result.id === movieTitle.toLowerCase().replace(/\s+/g, '-'));
      if (exactIdMatch) {
        console.log(`Found exact ID match for "${movieTitle}": "${exactIdMatch.title}" (ID: ${exactIdMatch.id})`);
        movieId = exactIdMatch.id;
      } else {
        // If no exact ID match, try to find a result whose ID contains the query
        const idContainsMatch = searchResults.find(result => 
          result.id.includes(movieTitle.toLowerCase().replace(/\s+/g, '-')));
        if (idContainsMatch) {
          console.log(`Found ID contains match for "${movieTitle}": "${idContainsMatch.title}" (ID: ${idContainsMatch.id})`);
          movieId = idContainsMatch.id;
        } else {
          console.log(`Using best match despite low similarity: "${bestMatch.title}" (ID: ${bestMatch.id})`);
        }
      }
    } else {
      console.log(`Best match for "${movieTitle}": "${bestMatch.title}" (ID: ${bestMatch.id}) with similarity score: ${highestSimilarity.toFixed(2)}`);
    }
    
    // Get the source
    const sourceData = await animeProvider.getSource(movieId, serverName);
    
    res.json({
      success: true,
      tmdbId,
      movieTitle,
      providerId: movieId,
      ...sourceData
    });
  } catch (error) {
    console.error('Error processing TMDB movie request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing request',
      message: error.message,
      details: error.response?.data
    });
  }
});

export default router;
