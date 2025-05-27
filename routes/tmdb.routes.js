import express from 'express';
import axios from 'axios';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');

// Helper function to search and get first result ID
async function searchAndGetFirstId(query) {
  try {
    const searchResults = await animeProvider.search(query);
    if (searchResults && searchResults.length > 0) {
      return searchResults[0].id;
    }
    return null;
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
    
    // Get the first result's ID
    const showId = searchResults[0].id;
    
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
    
    // Get the first result's ID
    const movieId = searchResults[0].id;
    
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
