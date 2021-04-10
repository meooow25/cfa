import {
  Achievement,
  AchievementDetails,
  AchievementDiffs,
} from "./achievement.ts";
import {
  AchievementBriefTmplContext,
  AchievementDiffsTmplContext,
  AchievementPopupTmplContext,
  AchievementsBoxTmplContext,
  containerClickableCls,
  CSS,
  diffsBtnCls,
  hiddenCls,
  renderAchievementDiffs,
  renderAchievementPopup,
  renderAchievementsBox,
} from "./ui_defs.ts";
import {
  htmlToElement,
  insertCss as insertCss_,
  showInFacebox,
} from "./cf_html_util.ts";

/** Inserts the CSS required for displaying achievements. */
export function insertCss() {
  insertCss_(CSS, "cfa-style");
}

function createTmplContexts(ach: Achievement, clickable = true): {
  brief: AchievementBriefTmplContext;
  popup: AchievementPopupTmplContext;
} {
  const usersAwardedPercent = ach.usersAwardedFraction.toLocaleString(
    undefined,
    {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
  const usersAwarded = ach.usersAwarded.toLocaleString();
  let mul: number | null = ach.grantInfos.length;
  if (mul == 1) {
    mul = null; // Don't show multiplier for single grant
  }
  return {
    brief: {
      isRare: ach.usersAwardedFraction <= 0.001,
      iconUrl: ach.iconUrl,
      title: ach.title,
      mul,
      usersAwardedPercent,
      brief: ach.brief,
      clickable,
    },
    popup: {
      title: ach.title,
      mul,
      usersAwarded,
      usersAwardedPercent,
      description: ach.description,
      grantInfos: ach.grantInfos,
    },
  };
}

/**
 * Inserts a box on a Codeforces user profile page with the given achievement
 * details.
 */
export function insertAchievementsBox(details: AchievementDetails) {
  // Rarer achievements first
  details.achievements.sort((a, b) => a.usersAwarded - b.usersAwarded);

  const boxTmplData: AchievementsBoxTmplContext = { achievements: [] };
  const popupTmplData: AchievementPopupTmplContext[] = [];
  for (const ach of details.achievements) {
    const { brief, popup } = createTmplContexts(ach);
    boxTmplData.achievements.push(brief);
    popupTmplData.push(popup);
  }

  const rendered = renderAchievementsBox(boxTmplData);

  const el = htmlToElement(rendered);
  el.querySelectorAll("." + containerClickableCls)
    .forEach((el, idx) => {
      el.addEventListener("click", () => {
        const rendered = renderAchievementPopup(popupTmplData[idx]);
        showInFacebox(rendered);
      });
    });

  document.querySelector("#pageContent")!.appendChild(el);
}

/**
 * Sets up achievement differences to be shown on the click of a button.
 * Must be on a Codeforces profile page with the achievements box already
 * inserted.
 */
export function setupAchievementDiffs(
  diffs: AchievementDiffs,
  diffsBtnCallback: () => void,
) {
  const added: AchievementBriefTmplContext[] = [];
  for (const ach of diffs.added) {
    const { brief } = createTmplContexts(ach, false);
    added.push(brief);
  }
  const removed: AchievementBriefTmplContext[] = [];
  for (const ach of diffs.removed) {
    const { brief } = createTmplContexts(ach, false);
    removed.push(brief);
  }

  const diffsTmpData: AchievementDiffsTmplContext = {
    anyAdded: added.length > 0,
    added,
    anyRemoved: removed.length > 0,
    removed,
  };

  const diffsBtn = document.querySelector("." + diffsBtnCls)!;
  diffsBtn.classList.remove(hiddenCls);
  diffsBtn.addEventListener("click", () => {
    const rendered = renderAchievementDiffs(diffsTmpData);
    showInFacebox(rendered);
    diffsBtnCallback();
  });
}
