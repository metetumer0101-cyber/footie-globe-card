import { SportmonksStandingRow, ParsedStandingRow, StandingsGroup } from '@/types/standings';

const TYPE_IDS = {
  OVERALL_PLAYED: 129,
  OVERALL_WON: 130,
  OVERALL_DRAW: 131,
  OVERALL_LOST: 132,
  OVERALL_GF: 133,
  OVERALL_GA: 134,
  GOAL_DIFFERENCE: 179,
  HOME_PLAYED: 135,
  HOME_WON: 136,
  HOME_DRAW: 137,
  HOME_LOST: 138,
  HOME_GF: 139,
  HOME_GA: 140,
  AWAY_PLAYED: 141,
  AWAY_WON: 142,
  AWAY_DRAW: 143,
  AWAY_LOST: 144,
  AWAY_GF: 145,
  AWAY_GA: 146,
};

export function parseSportmonksStandings(
  data: SportmonksStandingRow[],
  filterType: 'overall' | 'home' | 'away' = 'overall'
): StandingsGroup[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const groupedData: Record<string, SportmonksStandingRow[]> = {};

  data.forEach((row) => {
    const key = row.group_id ? `Group_${row.group_id}` : 'Main_Table';
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(row);
  });

  const resultGroups: StandingsGroup[] = [];

  Object.keys(groupedData).forEach((groupKey) => {
    const rows = groupedData[groupKey];

    const parsedRows: ParsedStandingRow[] = rows.map((row) => {
      const getDetailValue = (typeId: number): number => {
        const detail = row.details?.find((d) => d.type_id === typeId);
        return detail ? detail.value : 0;
      };

      let played = 0, won = 0, draw = 0, lost = 0, gf = 0, ga = 0;

      if (filterType === 'home') {
        played = getDetailValue(TYPE_IDS.HOME_PLAYED);
        won = getDetailValue(TYPE_IDS.HOME_WON);
        draw = getDetailValue(TYPE_IDS.HOME_DRAW);
        lost = getDetailValue(TYPE_IDS.HOME_LOST);
        gf = getDetailValue(TYPE_IDS.HOME_GF);
        ga = getDetailValue(TYPE_IDS.HOME_GA);
      } else if (filterType === 'away') {
        played = getDetailValue(TYPE_IDS.AWAY_PLAYED);
        won = getDetailValue(TYPE_IDS.AWAY_WON);
        draw = getDetailValue(TYPE_IDS.AWAY_DRAW);
        lost = getDetailValue(TYPE_IDS.AWAY_LOST);
        gf = getDetailValue(TYPE_IDS.AWAY_GF);
        ga = getDetailValue(TYPE_IDS.AWAY_GA);
      } else {
        played = getDetailValue(TYPE_IDS.OVERALL_PLAYED);
        won = getDetailValue(TYPE_IDS.OVERALL_WON);
        draw = getDetailValue(TYPE_IDS.OVERALL_DRAW);
        lost = getDetailValue(TYPE_IDS.OVERALL_LOST);
        gf = getDetailValue(TYPE_IDS.OVERALL_GF);
        ga = getDetailValue(TYPE_IDS.OVERALL_GA);
      }

      const gd = getDetailValue(TYPE_IDS.GOAL_DIFFERENCE) || (gf - ga);

      return {
        position: row.position,
        teamId: row.participant_id,
        teamName: row.participant?.name || 'Bilinmeyen Takım',
        teamLogo: row.participant?.image_path || '',
        played,
        won,
        draw,
        lost,
        goalsFor: gf,
        goalsAgainst: ga,
        goalDifference: gd,
        points: row.points ?? (won * 3 + draw),
        resultRule: row.result || null,
      };
    });

    parsedRows.sort((a, b) => a.position - b.position);

    resultGroups.push({
      groupId: rows[0]?.group_id || null,
      groupName: groupKey === 'Main_Table' ? 'Puan Durumu' : groupKey.replace('_', ' '),
      rows: parsedRows,
    });
  });

  return resultGroups;
}
