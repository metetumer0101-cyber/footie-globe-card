import { retryWithBackoff, isNetworkError, isRateLimitError } from './utils';

const SPORTMONKS_BASE_URL = 'https://api.sportmonks.com/v3/football';
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_API_KEY;

if (!SPORTMONKS_API_KEY) {
  throw new Error('SPORTMONKS_API_KEY environment variable is not set');
}

interface ApiConfig {
  timeout?: number;
  retries?: number;
}

const DEFAULT_CONFIG: ApiConfig = {
  timeout: 10000, // 10 seconds
  retries: 3,
};

/**
 * Fetch data from Sportmonks API with retry and error handling
 */
export async function fetchFromSportmonks<T>(
  endpoint: string,
  config: ApiConfig = {}
): Promise<T> {
  const { timeout = DEFAULT_CONFIG.timeout, retries = DEFAULT_CONFIG.retries } = config;

  return retryWithBackoff(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const url = `${SPORTMONKS_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${SPORTMONKS_API_KEY}`,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('429 Too Many Requests - Rate limit exceeded');
          }
          if (response.status >= 500) {
            throw new Error(`5${response.status} Server Error`);
          }
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - Server took too long to respond');
        }

        if (isNetworkError(error)) {
          throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }

        throw error;
      }
    },
    {
      maxRetries: retries,
      initialDelay: 1000,
      maxDelay: 8000,
      shouldRetry: (error) => {
        if (isRateLimitError(error)) {
          return false; // Don't retry rate limit errors immediately
        }
        return true;
      },
    }
  );
}

/**
 * Get live scores from Sportmonks
 */
export async function getLiveScores() {
  return fetchFromSportmonks('/scores/live', {
    timeout: 15000,
    retries: 2,
  });
}

/**
 * Get match details by ID
 */
export async function getMatchById(matchId: number) {
  return fetchFromSportmonks(`/matches/${matchId}`, {
    timeout: 12000,
    retries: 2,
  });
}

/**
 * Get team details by ID
 */
export async function getTeamById(teamId: number) {
  return fetchFromSportmonks(`/teams/${teamId}`, {
    timeout: 12000,
    retries: 2,
  });
}

/**
 * Get player details by ID
 */
export async function getPlayerById(playerId: number) {
  return fetchFromSportmonks(`/players/${playerId}`, {
    timeout: 12000,
    retries: 2,
  });
}

/**
 * Get competitions
 */
export async function getCompetitions() {
  return fetchFromSportmonks('/leagues', {
    timeout: 15000,
    retries: 2,
  });
}
