/**
 * API Response Types
 */

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    count: number;
    per_page: number;
    current_page: number;
    next_page?: string | null;
  };
  subscription?: {
    meta: {
      trial_ends_at: string | null;
      ended_at: string | null;
    };
  };
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

/**
 * Sportmonks Football Types
 */

export interface Team {
  id: number;
  name: string;
  short_code: string | null;
  logo_path: string | null;
  country_id: number;
  national_team: boolean;
  founded: number | null;
  venue_id: number | null;
}

export interface Player {
  id: number;
  display_name: string;
  firstname: string | null;
  lastname: string | null;
  common_name: string | null;
  nationality_id: number | null;
  position_id: number | null;
  date_of_birth: string | null;
  height: number | null;
  weight: number | null;
  image_path: string | null;
}

export interface Match {
  id: number;
  starting_at: string;
  starting_at_timestamp: number | null;
  state_id: number;
  state: {
    id: number;
    state: string;
    short_state: string;
  };
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  aggregate_id: number | null;
  round_id: number | null;
  venue_id: number | null;
  name: string | null;
  participants: MatchParticipant[];
  scores: MatchScore[];
  period_scores: MatchPeriodScore[];
  stats: MatchStat[] | null;
}

export interface MatchParticipant {
  id: number;
  name: string;
  short_code: string | null;
  image_path: string | null;
  meta: {
    location: 'home' | 'away';
    winner: boolean | null;
    position: number | null;
  };
}

export interface MatchScore {
  scorer_id: number | null;
  team_id: number;
  type: string;
  score: {
    goals: number;
    participant: string;
  };
}

export interface MatchPeriodScore {
  type: string;
  score: {
    goals: number;
    participant: string;
  };
}

export interface MatchStat {
  type_id: number;
  data: {
    value: string | number;
    team_id?: number;
    player_id?: number;
  };
}

export interface Competition {
  id: number;
  name: string;
  short_code: string | null;
  image_path: string | null;
  type: string;
  sub_type: string | null;
  country_id: number | null;
  is_cup: boolean;
  current_season_id: number | null;
}

export interface LiveScore {
  id: number;
  starting_at: string;
  starting_at_timestamp: number;
  state: {
    id: number;
    state: string;
    short_state: string;
  };
  league: {
    id: number;
    name: string;
  };
  participants: MatchParticipant[];
  scores: MatchScore[];
}

/**
 * App State Types
 */

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: null;
}

export interface SuccessState<T> {
  isLoading: false;
  error: null;
  data: T;
}

export interface ErrorState {
  isLoading: false;
  error: string;
  data: null;
}

export type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

/**
 * Utility Types
 */

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<SuccessState<T> | ErrorState>;
