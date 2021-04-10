/** A single achievement. */
export interface Achievement {
  title: string;
  brief: string;
  description: string;
  iconUrl: string;
  usersAwarded: number;
  usersAwardedFraction: number;
  grantInfos: string[];
}

/** A list of achievements for a user. */
export interface AchievementDetails {
  handle: string;
  achievements: Achievement[];
}

/** Converts a snake_case string to camelCase. */
function snakeToCamel(s: string): string {
  return s.replace(/_[a-z]/g, (match) => match[1].toUpperCase());
}

export type Json = null | boolean | number | string | Json[] | {
  [key: string]: Json;
};

/** Returns a JSON object with snake_case keys replaced by camelCase. */
function jsonSnakeToCamel(input: Json): Json {
  if (input == null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(jsonSnakeToCamel);
  }
  return Object.fromEntries(
    Object.entries(input).map((
      [key, value],
    ) => [snakeToCamel(key), jsonSnakeToCamel(value)]),
  );
}

export function achievementDetailsFromSnakeJson(
  json: Json,
): AchievementDetails {
  return jsonSnakeToCamel(json) as unknown as AchievementDetails;
}

export interface AchievementDiffs {
  added: Achievement[];
  removed: Achievement[];
  changed: boolean;
}

/**
 * Calculates the changes between two lists of old and new achievements,
 * returns what is present in new and not in old and vice versa.
 */
export function calculateDiffs(
  oldAchievements: Achievement[],
  newAchievements: Achievement[],
): AchievementDiffs {
  function notInAButInB(achsA: Achievement[], achsB: Achievement[]) {
    const setA = new Set();
    for (const ach of achsA) {
      setA.add(ach.title);
    }
    const achs = [];
    for (const ach of achsB) {
      if (!setA.has(ach.title)) {
        achs.push(ach);
      }
    }
    return achs;
  }

  const added = notInAButInB(oldAchievements, newAchievements);
  const removed = notInAButInB(newAchievements, oldAchievements);
  return {
    added,
    removed,
    changed: Boolean(added.length || removed.length),
  };
}
