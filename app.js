import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { DEFAULT_REQUEST_HEADERS } from './providers/utils/constants.js';

// Import route files
import animeRoutes from './routes/anime.routes.js';
import tmdbRoutes from './routes/tmdb.routes.js';
import playerRoutes from './routes/player.routes.js';
import searchRoutes from './routes/search.routes.js';
import seriesRoutes from './routes/series.routes.js';
import sourceRoutes from './routes/source.routes.js';
import anilistRoutes from './routes/anilist.routes.js';

// Verify TMDB API key is loaded
if (!process.env.TMDB_API_KEY) {
  console.error('Error: TMDB_API_KEY is not set in the environment variables');
  process.exit(1);
}

// Apply default headers to all outgoing Axios requests
axios.defaults.headers.common = {
  ...axios.defaults.headers.common,
  ...DEFAULT_REQUEST_HEADERS,
};

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use route files
app.use('/api/anime', animeRoutes);
app.use('/api', tmdbRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/source', sourceRoutes);
app.use('/api/anilist', anilistRoutes);

// Test endpoint to verify environment variables
app.get('/api/test-env', (req, res) => {
  res.json({
    success: true,
    tmdbApiKey: process.env.TMDB_API_KEY ? 'Set' : 'Not set',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'AnimeWorld India API',
    endpoints: [
      // Anime Routes
      { method: 'GET', path: '/api/anime/:showId/:episodeNum/server/:serverName', description: 'Get video source for a TV show by ID and episode' },
      { method: 'GET', path: '/api/anime/movie/:movieId/server/:serverName', description: 'Get video source for a movie by ID' },
      
      // TMDB Routes
      { method: 'GET', path: '/api/:tmdbId/:seasonNum/:episodeNum/server/:serverName', description: 'Get video source for a TV show episode by TMDB ID' },
      { method: 'GET', path: '/api/movie/:tmdbId/server/:serverName', description: 'Get video source for a movie by TMDB ID' },
      
      // Player Routes
      { method: 'GET', path: '/api/player/:id', description: 'Get video player data for a specific episode ID' },
      
      // Search Routes
      { method: 'GET', path: '/api/search?query=searchterm', description: 'Search for anime content' },
      
      // Series Routes
      { method: 'GET', path: '/api/series/:id', description: 'Get series information and episode list' },
      { method: 'GET', path: '/api/series/:id/season/:seasonNumber', description: 'Get episodes for a specific season' },
      
      // Source Routes
      { method: 'GET', path: '/api/source/:id?server=1', description: 'Extract direct video links from a specific server (by number)' },
      { method: 'GET', path: '/api/source/:id/server/:name', description: 'Extract direct video links from a specific server (by name)' },
      
      // Anilist Routes
      { method: 'GET', path: '/api/anilist/:anilistId/:episodeNum/server/:serverName', description: 'Get video source for a TV show by AniList ID and episode' },
      { method: 'GET', path: '/api/anilist/:anilistId/server/:serverName', description: 'Get video source for a movie by AniList ID' },

      // Test Route
      { method: 'GET', path: '/api/test-env', description: 'Test environment variables' }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
