import { getLogger } from "./log.ts";
import { initAndGetGM } from "./gm.ts";
import {
  AchievementDetails,
  AchievementDiffs,
  calculateDiffs,
} from "./achievement.ts";
import {
  AchievementAutoUpdater,
  ApiAchievementFetcher,
} from "./achievement_fetch.ts";
import { getHandleOnProfilePage, getLoggedInUser } from "./cf_html_util.ts";
import {
  insertAchievementsBox,
  insertCss,
  setupAchievementDiffs,
} from "./ui.ts";
import { Field } from "./storage_field.ts";
import { Storage } from "./storage.ts";
import { Observable } from "./observable.ts";
import { checkSupport } from "./support.ts";
import { NotificationStateManager } from "./notif_state.ts";
import { BroadcastChannel } from "./broadcast.ts";
import { assert } from "./assert.ts";

const logger = getLogger();

/**
 * Fetches achievements and inserts the achievements box on a profile page.
 * Returns the fetched achievements.
 */
async function setupOnProfilePage(
  fetcher: ApiAchievementFetcher,
): Promise<AchievementDetails> {
  const handle = getHandleOnProfilePage();
  const details = await fetcher.fetchAchievements(handle);
  insertCss();
  insertAchievementsBox(details);
  logger.info("Inserted achievements box");
  return details;
}

/** Clears the storage if the logged in user has changed. */
async function resetStorageOnLoggedInUserChange(
  storage: Storage,
  loggedInUser: string | null,
) {
  const lastLoggedInUser = await storage.loggedInUser.get();
  if (lastLoggedInUser === loggedInUser) {
    logger.debug("No changed in logged in user");
    return;
  }
  await storage.lastViewedAchievements.set(null);
  await storage.fetchAfter.set(null);
  await storage.notifState.set(null);
  await storage.loggedInUser.set(loggedInUser);
  logger.info("Logged in user updated:", lastLoggedInUser, "to", loggedInUser);
}

/**
 * Calculates achievement differences of the currently fetched achievements vs
 * stored last viewed achievements.
 * If there is no last viewed achievements, sets it to the current achievements
 * and returns null.
 */
async function calcAchievementDiffs(
  lastViewedAchievementsField: Field<AchievementDetails>,
  currentAchievements: AchievementDetails,
): Promise<AchievementDiffs | null> {
  const lastViewedAchievements = await lastViewedAchievementsField.get();

  if (!lastViewedAchievements) {
    await lastViewedAchievementsField.set(currentAchievements);
    logger.info("Saved achievements for the first time");
    return null;
  }

  const diffs = calculateDiffs(
    lastViewedAchievements.achievements,
    currentAchievements.achievements,
  );
  if (diffs.changed) {
    logger.debug("Achievements differ from last viewed");
  } else {
    logger.debug("No change in achievements since last viewed");
  }

  return diffs;
}

/**
 * Calculates differences between the currently fetched achievements and the
 * last viewed achievements. If there are any, sets up a button on the profile
 * page to display the differences to the user.
 * 
 * Must be called after the achievements box has already been inserted into the
 * page.
 */
async function setupDiffsOnProfilePage(
  details: AchievementDetails,
  storage: Storage,
  lastViewedAchievementsSavedCallback: () => void,
) {
  const diffs = await calcAchievementDiffs(
    storage.lastViewedAchievements,
    details,
  );
  if (!diffs?.changed) {
    return;
  }

  let savedAsViewed = false;
  setupAchievementDiffs(diffs, () => {
    if (!savedAsViewed) {
      storage.lastViewedAchievements.set(details);
      savedAsViewed = true;
      logger.info("Saved current achievements as viewed");
      lastViewedAchievementsSavedCallback();
    }
  });
}

interface RunConfig {
  apiUrlBase: string;
  local: boolean;
  debug: boolean;
}

export async function run({ apiUrlBase, local, debug }: RunConfig) {
  logger.setMinLevel(debug ? "DEBUG" : "INFO");

  const gm = initAndGetGM();
  const support = checkSupport(gm);

  // Primary feature is to show an achievement box on the profile page.
  assert(support.essential.ok, support.essential.msg!);

  const fetcher = new ApiAchievementFetcher(apiUrlBase, gm);

  let details;
  if (/^\/profile/.test(location.pathname)) {
    details = await setupOnProfilePage(fetcher);
  }
  // Primary feature end

  // Extra feature is to keep track of achievements for the logged in user and
  // notify them when it gets updated.
  const loggedInUser = getLoggedInUser();
  if (!loggedInUser) {
    logger.debug("No logged in user, not running auto updater");
    return;
  }

  if (!support.autoUpdate.ok) {
    logger.info(support.autoUpdate.msg);
    return;
  }

  const storage = new Storage(gm);

  await resetStorageOnLoggedInUserChange(storage, loggedInUser);

  const lastViewedAchievementsSaved = new Observable<void>();
  if (details?.handle === loggedInUser) {
    await setupDiffsOnProfilePage(
      details,
      storage,
      () => lastViewedAchievementsSaved.notify(),
    );
  }

  const refreshInterval = local ? 60 * 1000 : 60 * 60 * 1000; // 1m / 1h
  logger.debug("Using refresh interval", refreshInterval);
  const autoUpdater = new AchievementAutoUpdater(
    loggedInUser,
    fetcher,
    storage.fetchAfter,
    { value: refreshInterval, slack: refreshInterval * 0.2 },
  );

  const notifStateManager = new NotificationStateManager(
    autoUpdater,
    storage,
    lastViewedAchievementsSaved,
    new BroadcastChannel("stageChange"),
    (details) => calcAchievementDiffs(storage.lastViewedAchievements, details),
  );
  notifStateManager.start();
  // Extra feature end
}
