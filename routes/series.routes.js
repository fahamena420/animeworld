import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');

// Route to get series or movie data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const seriesData = await animeProvider.getSeries(id);
    res.json(seriesData);
  } catch (error) {
    console.error(`Error processing series request for ID ${req.params.id}:`, error.message);
    res.status(404).json({ 
      error: 'Content not found or error processing request',
      message: error.message
    });
  }
});

// Route to get episodes for a specific season
router.get('/:id/season/:seasonNumber', async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;
    const seasonData = await animeProvider.getSeason(id, parseInt(seasonNumber));
    res.json(seasonData);
  } catch (error) {
    console.error('Error processing season request:', error.message);
    res.status(404).json({ 
      error: 'Content not found or error processing request',
      message: error.message
    });
  }
});

export default router;
