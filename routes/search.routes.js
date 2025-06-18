import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();

// Route to search for content
router.get('/', async (req, res) => {
  try {
    const { query, provider } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let animeProvider;
    switch (provider) {
      case 'animeworld-india':
        animeProvider = new AnimeWorldIndiaMe();
        break;
      default:
        animeProvider = new AnimeWorldIndiaMe();
        break;
    }

    const searchResults = await animeProvider.search(query);
    res.json(searchResults);
  } catch (error) {
    console.error('Error processing search request:', error.message);
    res.status(500).json({
      error: 'Error processing search request',
      message: error.message,
    });
  }
});

export default router;
