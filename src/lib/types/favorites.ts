/**
 * Favorites System Types
 */

export interface FavoriteTeam {
  id: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  league?: string;
  addedAt: string;
}

export interface FavoritePlayer {
  id: number;
  playerId: number;
  playerName: string;
  playerImage: string | null;
  team?: string;
  position?: string;
  addedAt: string;
}

export interface FavoritesState {
  teams: FavoriteTeam[];
  players: FavoritePlayer[];
  isLoading: boolean;
  error: string | null;
}

export type FavoriteType = 'team' | 'player';

export interface AddFavoriteParams {
  type: FavoriteType;
  id: number;
  name: string;
  image?: string | null;
  team?: string;
  position?: string;
  league?: string;
}
