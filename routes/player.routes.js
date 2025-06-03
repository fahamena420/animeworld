import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://animeworld-india.me');

// Route to get video player data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playerData = await animeProvider.getPlayer(id);
    res.json(playerData);
  } catch (error) {
    console.error(`Error processing request for ID ${req.params.id}:`, error.message);
    res.status(404).json({ 
      error: 'Content not found or error processing request',
      message: error.message
    });
  }
});

export default router;
