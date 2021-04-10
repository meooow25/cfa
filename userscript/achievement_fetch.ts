import {
  AchievementDetails,
  achievementDetailsFromSnakeJson,
} from "./achievement.ts";
import { getLogger } from "./log.ts";
import { GmXmlHttpRequest } from "./gm.ts";
import { Field } from "./storage_field.ts";
import { Observable } from "./observable.ts";
import { assert } from "./assert.ts";

const logger = getLogger();

export interface AchievementFetcher {
  fetchAchievements(handle: string): Promise<AchievementDetails>;
}

/** Fetches achievements for handles from the API. */
export class ApiAchievementFetcher implements AchievementFetcher {
  constructor(
    private apiUrlBase: string,
    private gm: GmXmlHttpRequest,
  ) {
    assert(gm.xmlHttpRequest, "xmlHttpRequest not supported");
  }

  fetchAchievements(handle: string): Promise<AchievementDetails> {
    logger.debug("Fetching achievements for:", handle);
    const url = this.apiUrlBase + handle;
    return new Promise((resolve, reject) => {
      this.gm.xmlHttpRequest!({
        url,
        method: "GET",
        timeout: 10000,
        onload: (response) => {
          if (response.status === 200) {
            const result = JSON.parse(response.responseText);
            const achievementDetails = achievementDetailsFromSnakeJson(result);
            logger.debug("Fetched achievements:", achievementDetails);
            resolve(achievementDetails);
          } else {
            let errorMsg = response.status + " " + response.statusText;
            if (response.responseText) {
              errorMsg += ": " + response.responseText;
            }
            reject(new Error(errorMsg));
          }
        },
        onerror: () => reject(new Error("Achievement fetch XHR error")),
        ontimeout: () => reject(new Error("Achievement fetch XHR timeout")),
      });
    });
  }
}

/** Auto fetches achievements at regular intervals for a particular user. */
export class AchievementAutoUpdater {
  private timeoutID: number | null = null;
  private running = false;
  readonly onFetch = new Observable<AchievementDetails>();
  constructor(
    private loggedInUser: string,
    private fetcher: AchievementFetcher,
    private fetchAfter: Field<number>,
    private cooldown: { value: number; slack: number },
  ) {
  }

  private randomDelay(): number {
    // Randomness to compensate for lack of synchronization. We don't want
    // multiple scripts waking up and fetching at once.
    return Math.floor(Math.random() * this.cooldown.slack);
  }

  private async tryFetch() {
    const now = Date.now();
    const fetchAfter = (await this.fetchAfter.get()) ?? 0;

    if (now < fetchAfter) {
      // Too early, reschedule
      const delay = fetchAfter - now + this.randomDelay();
      this.timeoutID = setTimeout(() => this.tryFetch(), delay);
      return;
    }

    try {
      logger.debug("Auto fetching achievements");
      const details = await this.fetcher.fetchAchievements(this.loggedInUser);
      await this.fetchAfter.set(now + this.cooldown.value);
      this.onFetch.notify(details);

      // Next call, expected to be rescheduled
      this.tryFetch();
    } catch (e) {
      logger.error("Auto fetching error:", e);

      // Some error occured, try again after full cooldown
      const delay = this.cooldown.value + this.randomDelay();
      this.timeoutID = setTimeout(() => this.tryFetch(), delay);
    }
  }

  start() {
    assert(!this.running, "Auto updater already running");
    this.running = true;
    this.tryFetch();
  }

  stop() {
    if (this.running) {
      clearTimeout(this.timeoutID!);
      this.running = false;
    }
  }
}
