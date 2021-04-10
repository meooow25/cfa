import { GmField } from "./storage_field.ts";
import { GmSetGetValue } from "./gm.ts";
import type { AchievementDetails } from "./achievement.ts";
import type { State } from "./notif_state.ts";

/** A fixed set of userscript storage fields. */
export class Storage {
  loggedInUser: GmField<string>;
  lastViewedAchievements: GmField<AchievementDetails>;
  fetchAfter: GmField<number>;
  notifState: GmField<State>;

  constructor(gm: GmSetGetValue) {
    this.loggedInUser = new GmField(gm, "loggedInUser");
    this.lastViewedAchievements = new GmField(gm, "lastViewedAchievements");
    this.fetchAfter = new GmField(gm, "fetchAfter");
    this.notifState = new GmField(gm, "notifState");
  }
}
