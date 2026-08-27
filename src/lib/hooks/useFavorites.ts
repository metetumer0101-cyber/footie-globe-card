import { useState, useEffect, useCallback } from 'react';
import type { FavoriteTeam, FavoritePlayer, AddFavoriteParams, FavoritesState } from '../types/favorites';

const STORAGE_KEY_TEAMS = 'footcard_favorites_teams';
const STORAGE_KEY_PLAYERS = 'footcard_favorites_players';

const initialState: FavoritesState = {
  teams: [],
  players: [],
  isLoading: true,
  error: null,
};

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>(initialState);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const teams = localStorage.getItem(STORAGE_KEY_TEAMS);
      const players = localStorage.getItem(STORAGE_KEY_PLAYERS);

      setState({
        teams: teams ? JSON.parse(teams) : [],
        players: players ? JSON.parse(players) : [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load favorites:', error);
      setState(prev => ({ ...prev, isLoading: false, error: 'Favoriler yüklenemedi' }));
    }
  }, []);

  // Save teams to localStorage
  const saveTeams = useCallback((teams: FavoriteTeam[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
    } catch (error) {
      console.error('Failed to save favorite teams:', error);
    }
  }, []);

  // Save players to localStorage
  const savePlayers = useCallback((players: FavoritePlayer[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    } catch (error) {
      console.error('Failed to save favorite players:', error);
    }
  }, []);

  // Add favorite
  const addFavorite = useCallback((params: AddFavoriteParams) => {
    if (params.type === 'team') {
      setState(prev => {
        const exists = prev.teams.some(t => t.teamId === params.id);
        if (exists) {
          return { ...prev, error: 'Bu takım zaten favorilerde' };
        }

        const newTeam: FavoriteTeam = {
          id: Date.now(),
          teamId: params.id,
          teamName: params.name,
          teamLogo: params.image ?? null,
          league: params.league,
          addedAt: new Date().toISOString(),
        };

        const newTeams = [newTeam, ...prev.teams];
        saveTeams(newTeams);

        return {
          ...prev,
          teams: newTeams,
          error: null,
        };
      });
    } else {
      setState(prev => {
        const exists = prev.players.some(p => p.playerId === params.id);
        if (exists) {
          return { ...prev, error: 'Bu oyuncu zaten favorilerde' };
        }

        const newPlayer: FavoritePlayer = {
          id: Date.now(),
          playerId: params.id,
          playerName: params.name,
          playerImage: params.image ?? null,
          team: params.team,
          position: params.position,
          addedAt: new Date().toISOString(),
        };

        const newPlayers = [newPlayer, ...prev.players];
        savePlayers(newPlayers);

        return {
          ...prev,
          players: newPlayers,
          error: null,
        };
      });
    }
  }, [saveTeams, savePlayers]);

  // Remove favorite team
  const removeTeam = useCallback((teamId: number) => {
    setState(prev => {
      const newTeams = prev.teams.filter(t => t.teamId !== teamId);
      saveTeams(newTeams);
      return { ...prev, teams: newTeams };
    });
  }, [saveTeams]);

  // Remove favorite player
  const removePlayer = useCallback((playerId: number) => {
    setState(prev => {
      const newPlayers = prev.players.filter(p => p.playerId !== playerId);
      savePlayers(newPlayers);
      return { ...prev, players: newPlayers };
    });
  }, [savePlayers]);

  // Check if team is favorite
  const isTeamFavorite = useCallback((teamId: number) => {
    return state.teams.some(t => t.teamId === teamId);
  }, [state.teams]);

  // Check if player is favorite
  const isPlayerFavorite = useCallback((playerId: number) => {
    return state.players.some(p => p.playerId === playerId);
  }, [state.players]);

  // Toggle favorite team
  const toggleTeam = useCallback((params: Omit<AddFavoriteParams, 'type'>) => {
    if (isTeamFavorite(params.id)) {
      removeTeam(params.id);
    } else {
      addFavorite({ type: 'team', ...params });
    }
  }, [isTeamFavorite, removeTeam, addFavorite]);

  // Toggle favorite player
  const togglePlayer = useCallback((params: Omit<AddFavoriteParams, 'type'>) => {
    if (isPlayerFavorite(params.id)) {
      removePlayer(params.id);
    } else {
      addFavorite({ type: 'player', ...params });
    }
  }, [isPlayerFavorite, removePlayer, addFavorite]);

  // Clear all favorites
  const clearAll = useCallback(() => {
    saveTeams([]);
    savePlayers([]);
    setState(prev => ({ ...prev, teams: [], players: [] }));
  }, [saveTeams, savePlayers]);

  return {
    teams: state.teams,
    players: state.players,
    isLoading: state.isLoading,
    error: state.error,
    addFavorite,
    removeTeam,
    removePlayer,
    isTeamFavorite,
    isPlayerFavorite,
    toggleTeam,
    togglePlayer,
    clearAll,
  };
}

export default useFavorites;
