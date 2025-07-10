import express from 'express';
import axios from 'axios';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe();
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

// Helper function to search TMDB for a movie by title
async function searchTMDBForMovie(title) {
  try {
    const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: process.env.TMDB_API_KEY,
        query: title,
        include_adult: false
      }
    });
    return response.data.results[0]?.id;
  } catch (error) {
    console.error('TMDB search error:', error.message);
    return null;
  }
}

// TV Show Endpoint: /api/anilist/:anilistId/episodenum/:episodeNum/server/:serverName
router.get('/:anilistId/episodeNum/:episodeNum/server/:serverName', async (req, res) => {
  const { anilistId, episodeNum, serverName } = req.params;

  try {
    // Get mapping from Ani.zip
    const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    
    if (!data || !data.mappings || data.mappings.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No mapping found for this AniList ID' 
      });
    }

    // Extract TMDB ID and season number from the mappings
    const tmdbId = data?.mappings?.themoviedb_id;
    if (!tmdbId) {
      return res.status(404).json({ 
        success: false, 
        error: 'TMDB ID not found for this series',
        details: 'The mapping data does not contain a TMDB ID'
      });
    }
    
    // Get the first episode to determine the season number
    const firstEpisode = data.episodes?.[Object.keys(data.episodes || {})[0]];
    const seasonNumber = firstEpisode?.seasonNumber || 1;
    
    // Get the show name from TMDB
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
    const episodeId = `${showId}-${seasonNumber}x${episodeNum}`;
    const sourceData = await animeProvider.getSource(episodeId, serverName);
    
    res.json({
      success: true,
      source: 'anilist',
      anilistId,
      tmdbId,
      showName,
      season: parseInt(seasonNumber),
      episode: parseInt(episodeNum),
      providerId: showId,
      ...sourceData
    });
    
  } catch (error) {
    console.error('Error processing AniList TV request:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

// Movie Endpoint: /api/anilist/:anilistId/server/:serverName
router.get('/:anilistId/server/:serverName', async (req, res) => {
  const { anilistId, serverName } = req.params;

  try {
    // Get movie info from AniList
    const { data } = await axios.post('https://graphql.anilist.co', {
      query: `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            title {
              romaji
              english
              native
            }
            format
            isAdult
          }
        }
      `,
      variables: { id: parseInt(anilistId) }
    });

    const media = data.data?.Media;
    
    if (!media) {
      return res.status(404).json({ 
        success: false, 
        error: 'Anime not found on AniList' 
      });
    }

    if (media.format !== 'MOVIE') {
      return res.status(400).json({ 
        success: false, 
        error: 'This is not a movie. Use the TV show endpoint instead.' 
      });
    }

    // Get the movie title from AniList
    const title = media.title.english || media.title.romaji || media.title.native;
    
    // Search TMDB for the movie
    const tmdbId = await searchTMDBForMovie(title);
    
    if (!tmdbId) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not find this movie on TMDB' 
      });
    }
    
    // Get movie details from TMDB
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
      source: 'anilist',
      anilistId,
      tmdbId,
      movieTitle,
      providerId: movieId,
      ...sourceData
    });
    
  } catch (error) {
    console.error('Error processing AniList movie request:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to process request',
      details: error.message 
    });
  }
});

export default router;
