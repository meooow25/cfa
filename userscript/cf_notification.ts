import { showToast } from "./cf_html_util.ts";
import { assert } from "./assert.ts";

/**
 * A notification that is shown as as a Codeforces toast to the user.
 * If the document is visible, it is shown immediately. If not, it is scheduled
 * to be shown the next time the document becomes visible.
 */
export class CfNotification {
  private finish: ((cancelled?: boolean) => void) | null = null;
  constructor(private msg: string) {
  }

  show(): Promise<void> {
    assert(!this.finish, "Notification already pending");

    if (document.visibilityState === "visible") {
      showToast(this.msg);
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const listener = () => {
        if (document.visibilityState !== "visible") {
          return;
        }
        showToast(this.msg);
        this.finish!();
      };
      document.addEventListener("visibilitychange", listener);
      this.finish = (cancelled) => {
        document.removeEventListener("visibilitychange", listener);
        if (cancelled) {
          reject(new Error("Notification cancelled"));
        } else {
          resolve();
        }
      };
    });
  }

  cancel() {
    if (this.finish) {
      this.finish(true);
      this.finish = null;
    }
  }
}
