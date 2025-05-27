/**
 * AnimeWorld India API Client
 * A JavaScript client for interacting with the AnimeWorld India API
 */

class AnimeWorldAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  /**
   * Search for anime content
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of search results
   */
  async search(query) {
    try {
      const response = await fetch(`${this.baseURL}/api/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Search failed with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching for anime:', error);
      throw error;
    }
  }

  /**
   * Get series information and episode list
   * @param {string} id - The series ID
   * @returns {Promise<Object>} - Series data including episodes
   */
  async getSeries(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/series/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get series with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error getting series ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get video player data for an episode
   * @param {string} id - The episode ID
   * @returns {Promise<Object>} - Player data including iframe source
   */
  async getPlayer(id) {
    try {
      const response = await fetch(`${this.baseURL}/api/player/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get player with status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error getting player for episode ${id}:`, error);
      throw error;
    }
  }
}

// Example usage:
// const api = new AnimeWorldAPI();
// 
// // Search for anime
// api.search('jujutsu kaisen').then(results => {
//   console.log('Search results:', results);
// });
// 
// // Get series info
// api.getSeries('jujutsu-kaisen').then(seriesData => {
//   console.log('Series data:', seriesData);
// });
// 
// // Get player data
// api.getPlayer('jujutsu-kaisen-1x1').then(playerData => {
//   console.log('Player data:', playerData);
// });
