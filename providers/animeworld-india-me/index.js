import { extractPlayerData } from './models/player.js';
import { searchContent } from './models/search.js';
import { getSeriesData, getSeasonData } from './models/series.js';
import { extractSource } from './models/source.js';

export class AnimeWorldIndiaMe {
  constructor(baseUrl = 'https://animeworld-india.me') {
    this.baseUrl = baseUrl;
  }

  // Player methods
  async getPlayer(id) {
    return extractPlayerData(id, this.baseUrl);
  }

  // Search methods
  async search(query) {
    return searchContent(query, this.baseUrl);
  }

  // Series methods
  async getSeries(id) {
    return getSeriesData(id, this.baseUrl);
  }

  async getSeason(seriesId, seasonNumber) {
    return getSeasonData(seriesId, seasonNumber, this.baseUrl);
  }

  // Source methods
  async getSource(id, serverName) {
    return extractSource(id, serverName, this.baseUrl);
  }
}

export default AnimeWorldIndiaMe;
