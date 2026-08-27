export interface SportmonksStandingRow {
  id: number;
  participant_id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number | null;
  round_id: number | null;
  position: number;
  points: number;
  result: string | null;
  details: Array<{
    id: number;
    standing_id: number;
    type_id: number;
    value: number;
  }>;
  participant?: {
    id: number;
    name: string;
    image_path: string;
  };
}

export interface ParsedStandingRow {
  position: number;
  teamId: number;
  teamName: string;
  teamLogo: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string;
  resultRule?: string | null;
}

export interface StandingsGroup {
  groupId: number | null;
  groupName: string;
  rows: ParsedStandingRow[];
}
