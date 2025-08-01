import express from 'express';
import axios from 'axios';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';
import { AnimeDekho } from '../providers/animedekho/index.js';
import { Satoru } from '../providers/satoru/index.js';

const router = express.Router();

const providers = {
  animeworld: new AnimeWorldIndiaMe(),
  animedekho: new AnimeDekho(),
  satoru: new Satoru(),
};
const SIMILARITY_THRESHOLD = 0.6; // Minimum similarity score to consider a match valid

// Special handling for Naruto and Naruto Shippuden seasons
const NARUTO_ID = 20;
const NARUTO_SHIPPUDEN_ID = 1735;

const narutoSeasons = [
  { season: 1, start: 1, end: 52, offset: 0 },
  { season: 2, start: 53, end: 104, offset: 52 },
  { season: 3, start: 105, end: 158, offset: 104 },
  { season: 4, start: 159, end: 220, offset: 158 },
];

const narutoShippudenSeasons = [
  { season: 0, start: 1, end: 3, offset: 0 },
  { season: 1, start: 4, end: 35, offset: 3 },
  { season: 2, start: 36, end: 56, offset: 35 },
  { season: 3, start: 57, end: 74, offset: 56 },
  { season: 4, start: 75, end: 91, offset: 74 },
  { season: 5, start: 92, end: 115, offset: 91 },
  { season: 6, start: 116, end: 146, offset: 115 },
  { season: 7, start: 147, end: 154, offset: 146 },
  { season: 8, start: 155, end: 178, offset: 154 },
  { season: 9, start: 179, end: 199, offset: 178 },
  { season: 10, start: 200, end: 224, offset: 199 },
  { season: 11, start: 225, end: 245, offset: 224 },
  { season: 12, start: 246, end: 278, offset: 245 },
  { season: 13, start: 279, end: 298, offset: 278 },
  { season: 14, start: 299, end: 323, offset: 298 },
  { season: 15, start: 324, end: 351, offset: 323 },
  { season: 16, start: 352, end: 364, offset: 351 },
  { season: 17, start: 365, end: 375, offset: 364 },
  { season: 18, start: 376, end: 396, offset: 375 },
  { season: 19, start: 397, end: 416, offset: 396 },
  { season: 20, start: 417, end: 503, offset: 416 },
];

function getNarutoSeasonInfo(anilistId, episodeNum) {
  const episodeNumber = parseInt(episodeNum, 10);
  let seasonData;

  if (anilistId == NARUTO_ID) {
    seasonData = narutoSeasons.find(s => episodeNumber >= s.start && episodeNumber <= s.end);
  } else if (anilistId == NARUTO_SHIPPUDEN_ID) {
    seasonData = narutoShippudenSeasons.find(s => episodeNumber >= s.start && episodeNumber <= s.end);
  }

  if (seasonData) {
    return {
      seasonNumber: seasonData.season,
      episodeInSeason: episodeNumber - seasonData.offset,
    };
  }

  return null; // Not a special case or episode not found
}

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
  const animeProvider = providers[serverName] || providers.animeworld;

  try {
    let tmdbId, seasonNumber, episodeInSeason;

    // Step 1: Get TMDB ID, Season, and Episode Number
    if (anilistId == NARUTO_ID || anilistId == NARUTO_SHIPPUDEN_ID) {
      const narutoInfo = getNarutoSeasonInfo(anilistId, episodeNum);
      if (!narutoInfo) {
        return res.status(404).json({ success: false, error: 'Episode not found in Naruto season data' });
      }
      tmdbId = anilistId == NARUTO_ID ? '46260' : '31910';
      seasonNumber = narutoInfo.seasonNumber;
      episodeInSeason = narutoInfo.episodeInSeason;
    } else {
      const { data } = await axios.get(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
      if (!data || !data.mappings || !data.mappings.themoviedb_id) {
        return res.status(404).json({ success: false, error: 'No mapping found for this AniList ID' });
      }
      tmdbId = data.mappings.themoviedb_id;
      const firstEpisode = data.episodes?.[Object.keys(data.episodes || {})[0]];
      seasonNumber = firstEpisode?.seasonNumber || 1;
      episodeInSeason = parseInt(episodeNum, 10);
    }

    // Step 2: Get Show Name from TMDB
    const tmdbResponse = await axios.get(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`);
    if (!tmdbResponse.data || !tmdbResponse.data.name) {
      return res.status(404).json({ success: false, error: 'TV show not found on TMDB' });
    }
    const showName = tmdbResponse.data.name;

    // Step 3: Search provider for the show (if necessary)
    let showId = tmdbId; // Default to tmdbId for providers that don't need a search (like animedekho)
    if (serverName !== 'animedekho') {
      const searchResults = await animeProvider.search(showName);
      if (!searchResults || searchResults.length === 0) {
        return res.status(404).json({ success: false, error: `No results found for "${showName}" in the provider` });
      }

      let bestMatch = searchResults[0];
      let highestSimilarity = stringSimilarity(showName, searchResults[0].title);
      for (let i = 1; i < searchResults.length; i++) {
        const similarity = stringSimilarity(showName, searchResults[i].title);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = searchResults[i];
        }
      }
      showId = bestMatch.id;
      console.log(`Best match for "${showName}": "${bestMatch.title}" (ID: ${showId}) with similarity score: ${highestSimilarity.toFixed(2)}`);
    }

    // Step 4: Get the streaming source from the provider
    let sourceData;
    if (serverName === 'satoru') {
      sourceData = await animeProvider.getSource(showId, serverName, episodeNum);
    } else if (serverName === 'animedekho') {
      const episodeId = `${tmdbId}-${seasonNumber}x${episodeInSeason}`;
      sourceData = await animeProvider.getSource(episodeId, serverName);
    } else {
      const episodeId = `${showId}-${seasonNumber}x${episodeInSeason}`;
      sourceData = await animeProvider.getSource(episodeId, serverName);
    }

    res.json({
      success: true,
      source: 'anilist',
      anilistId,
      tmdbId,
      showName,
      season: parseInt(seasonNumber, 10),
      episode: parseInt(episodeNum, 10),
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
  const animeProvider = providers[serverName] || providers.animeworld;
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
    let movieId = tmdbId; // Default to tmdbId for animedekho

    if (serverName !== 'animedekho') {
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
      
      movieId = bestMatch.id;
      
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
    }
    
    // The animedekho provider uses a different ID format
    let sourceData;
    if (serverName === 'animedekho') {
      // For movies, animedekho doesn't need season/episode, just tmdbId
      const episodeId = `${tmdbId}-1x1`; // Dummy season/episode
      sourceData = await animeProvider.getSource(episodeId, serverName);
    } else {
      // Get the source
      sourceData = await animeProvider.getSource(movieId, serverName);
    }
    
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
