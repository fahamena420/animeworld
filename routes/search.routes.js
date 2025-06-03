import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://goodproxy.goodproxy.workers.dev/fetch?url=https://animeworld-india.me');

// Route to search for content
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchResults = await animeProvider.search(query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error processing search request:', error.message);
    res.status(500).json({ 
      error: 'Error processing search request',
      message: error.message
    });
  }
});

export default router;
