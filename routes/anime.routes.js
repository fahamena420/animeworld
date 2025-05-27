import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');

// Endpoint for TV Shows by ID and Episode
router.get('/:showId/:episodeNum/server/:serverName', async (req, res) => {
  try {
    const { showId, episodeNum, serverName } = req.params;
    
    // Get the episode ID in the format showId-1xepisodeNum
    const episodeId = `${showId}-1x${episodeNum}`;
    
    // Get the source
    const sourceData = await animeProvider.getSource(episodeId, serverName);
    
    res.json({
      success: true,
      providerId: showId,
      episodeId,
      episode: parseInt(episodeNum),
      ...sourceData
    });
  } catch (error) {
    console.error('Error processing TV request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing request',
      message: error.message
    });
  }
});

// Endpoint for Movies by ID
router.get('/movie/:movieId/server/:serverName', async (req, res) => {
  try {
    const { movieId, serverName } = req.params;
    
    // Get the source
    const sourceData = await animeProvider.getSource(movieId, serverName);
    
    res.json({
      success: true,
      providerId: movieId,
      type: 'movie',
      ...sourceData
    });
  } catch (error) {
    console.error('Error processing movie request:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error processing request',
      message: error.message
    });
  }
});

export default router;
