import { getLogger } from "./log.ts";
import { AchievementDetails, AchievementDiffs } from "./achievement.ts";
import { AchievementAutoUpdater } from "./achievement_fetch.ts";
import { Storage } from "./storage.ts";
import { Observable } from "./observable.ts";
import { BroadcastChannel } from "./broadcast.ts";
import { CfNotification } from "./cf_notification.ts";

/**
 * There are 3 possible states when the user is logged in and auto update is
 * supported. The states are shared by all instances of the script.
 * 
 * The last viewed achievements by the user are stored. The auto updater
 * fetches achievements and detects changes against the last viewed
 * achievements.
 * 
 * The states are:
 * 
 * NO_NOTIF
 * No change in achievements have been detected. The auto updater runs until
 * it finds changes. When it does, the state changes to PENDING_NOTIF.
 * 
 * PENDING_NOTIF
 * Changes have been detected. Notifications about the change are attempted to
 * be shown to the user. When any notification is shown, state changes to
 * SHOWN_NOTIF.
 * 
 * SHOWN_NOTIF
 * We don't want to bother the user with repeated notifications, so no
 * notifications are shown again. Once the user clicks on the diff button on
 * their profile, the state changes to NO_NOTIF.
 */
export type State = "NO_NOTIF" | "PENDING_NOTIF" | "SHOWN_NOTIF";

const logger = getLogger();

type StopFn = () => void;

/**
 * Runs everything needed to detect changes in achievements for the logged in
 * user and notify them.
 */
export class NotificationStateManager {
  constructor(
    private autoUpdater: AchievementAutoUpdater,
    private storage: Storage,
    private lastViewedAchievementsSaved: Observable<void>,
    private stateChangeChannel: BroadcastChannel,
    private diffVsLastViewedAchievements: (
      details: AchievementDetails,
    ) => Promise<AchievementDiffs | null>,
  ) {
  }

  async start() {
    while (true) {
      const state: State = (await this.storage.notifState.get()) ?? "NO_NOTIF";
      logger.debug("Current state:", state);

      let stop: StopFn;
      switch (state) {
        case "NO_NOTIF":
          stop = this.runForNoNotif();
          break;
        case "PENDING_NOTIF":
          stop = this.runForPendingNotif();
          break;
        case "SHOWN_NOTIF":
          stop = this.runForShownNotif();
          break;
        default: {
          const _: never = state;
        }
      }

      await this.stateChangeChannel.listenOnce();
      logger.debug("Received state change message");
      stop!();

      // Important: Wait for things to settle
      // Syncing the state via GM is apparently not immediate. The broadcast
      // happens faster and we can end up reading the old state in the next
      // iteration if we don't wait.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  private async changeState(from: State, to: State) {
    logger.debug("State change:", from, "to", to);
    await this.storage.notifState.set(to);
    this.stateChangeChannel.broadcast();
  }

  private runForNoNotif(): StopFn {
    this.autoUpdater.onFetch.setCallback(
      async (details) => {
        const diffs = await this.diffVsLastViewedAchievements(details);
        if (diffs?.changed) {
          await this.changeState("NO_NOTIF", "PENDING_NOTIF");
        }
      },
    );
    this.autoUpdater.start();

    return () => {
      this.autoUpdater.onFetch.clearCallback();
      this.autoUpdater.stop();
    };
  }

  private runForPendingNotif(): StopFn {
    const notification = new CfNotification(
      "Your achievements have been updated. Visit your profile to see the changes!",
    );
    // Show notification on this page when visible
    notification.show().then(
      async () => {
        // Notification shown
        await this.changeState("PENDING_NOTIF", "SHOWN_NOTIF");
      },
      (e) => {
        if (!e.message.includes("cancelled")) {
          throw e;
        }
        logger.debug(e.message);
      },
    );

    return () => notification.cancel();
  }

  private runForShownNotif(): StopFn {
    this.lastViewedAchievementsSaved.setCallback(async () => {
      await this.changeState("SHOWN_NOTIF", "NO_NOTIF");
    });

    return () => this.lastViewedAchievementsSaved.clearCallback();
  }
}
