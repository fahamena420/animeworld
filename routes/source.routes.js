import express from 'express';
import { AnimeWorldIndiaMe } from '../providers/animeworld-india-me/index.js';

const router = express.Router();
const animeProvider = new AnimeWorldIndiaMe('https://goodproxy.goodproxy.workers.dev/fetch?url=https://animeworld-india.me');

// Route to extract source links from a specific server by name
router.get('/:id/server/:name', async (req, res) => {
  try {
    const { id, name } = req.params;
    const sourceData = await animeProvider.getSource(id, name);
    res.json(sourceData);
  } catch (error) {
    console.error('Error processing source request:', error.message);
    res.status(404).json({ 
      success: false,
      error: error.message || 'Error processing request',
      message: error.message
    });
  }
});

// Route to extract source links from a specific server by number
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { server } = req.query;
    
    if (!server) {
      return res.status(400).json({ 
        success: false,
        error: 'Server number is required. Use ?server=1 format.'
      });
    }
    
    const sourceData = await animeProvider.getSource(id, server);
    res.json(sourceData);
  } catch (error) {
    console.error('Error processing source request:', error.message);
    res.status(404).json({ 
      success: false,
      error: error.message || 'Error processing request',
      message: error.message
    });
  }
});

export default router;
