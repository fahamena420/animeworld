import express from 'express';
import axios from 'axios';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');

const router = express.Router();

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
    
    // Get the first result's ID
    const showId = searchResults[0].id;
    
    // Format the episode ID as {showId}-{seasonNum}x{episodeNum}
    const episodeId = `${showId}-${seasonNumber}x${episodeNum}`;
    
    // Get the source from our provider
    const sourceData = await animeProvider.getSource(episodeId, serverName);
    
    // Return the source data
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

    // Search TMDB for the movie
    const title = media.title.english || media.title.romaji || media.title.native;
    const tmdbId = await searchTMDBForMovie(title);
    
    if (!tmdbId) {
      return res.status(404).json({ 
        success: false, 
        error: 'Could not find this movie on TMDB' 
      });
    }

    // Redirect to internal movie endpoint
    return res.redirect(`/api/movie/${tmdbId}/server/${serverName}`);
    
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
