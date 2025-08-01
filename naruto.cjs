const fetch = require('node-fetch'); // For Node.js (CommonJS)
const TMDB_API_KEY = '61e2290429798c561450eb56b26de19b';
const BASE_URL = 'https://api.themoviedb.org/3';
const SHOW_ID = 31910; // TMDB ID for "Naruto"

// Function to fetch season details
async function fetchSeasonDetails(seasonNumber) {
  try {
    const response = await fetch(
      `${BASE_URL}/tv/${SHOW_ID}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
    );
    if (!response.ok) {
      console.error(`Failed to fetch season ${seasonNumber}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber}:`, error.message);
    return null;
  }
}

// Function to fetch show details and seasons
async function fetchNarutoSeasons() {
  try {
    // Fetch TV show details
    const showResponse = await fetch(
      `${BASE_URL}/tv/${SHOW_ID}?api_key=${TMDB_API_KEY}`
    );
    if (!showResponse.ok) {
      throw new Error(`Failed to fetch show details: ${showResponse.status}`);
    }
    const showData = await showResponse.json();
    const showName = showData.name;
    const numberOfSeasons = showData.number_of_seasons;

    console.log(`Show: ${showName}`);
    console.log(`Total Seasons: ${numberOfSeasons}`);

    // Fetch each season
    const seasons = [];
    let cumulativeEpisodeCount = 0; // Track total episodes for continuous ranges
    for (let seasonNumber = 0; seasonNumber <= numberOfSeasons; seasonNumber++) { // Include season 0 (Specials)
      const seasonData = await fetchSeasonDetails(seasonNumber);
      if (seasonData) {
        const episodeCount = seasonData.episodes.length;
        const startEpisode = cumulativeEpisodeCount + 1;
        const endEpisode = cumulativeEpisodeCount + episodeCount;
        seasons.push({
          season_number: seasonData.season_number,
          name: seasonData.name || `Season ${seasonNumber}`,
          episode_count: episodeCount,
          episode_range: episodeCount > 0 ? `${startEpisode} to ${endEpisode}` : 'No episodes'
        });
        cumulativeEpisodeCount += episodeCount; // Update cumulative count
      }
    }

    // Output season details
    seasons.forEach(season => {
      console.log(`Season ${season.season_number}: ${season.name}`);
      console.log(`  Episode Count: ${season.episode_count}`);
      console.log(`  Episode Range: ${season.episode_range}`);
    });

    // Display total episodes
    console.log(`Total Episodes Across All Seasons: ${cumulativeEpisodeCount}`);

    return seasons;
  } catch (error) {
    console.error('Error fetching Naruto seasons:', error.message);
    return [];
  }
}

// Execute the function
fetchNarutoSeasons();