import { Mustache } from "./deps.ts";

export const hiddenCls = "cfa-hidden";
export const containerClickableCls = "cfa-ach-container-clickable";

export const CSS = `
  #cfa-root {
    padding: 1em;
    margin-top: 1em;

    --rare-anim-duration: 3s;
  }
  .cfa-hidden {
    display: none;
  }
  .cfa-heading-container {
    display: flex;
    align-items: center;
    margin: 5px 0 15px 10px;
  }
  .cfa-heading-item {
  }
  .cfa-heading {
    font-size: 18px;
    font-weight: bold;
  }
  .cfa-diffs-btn {
    margin-left: 10px;
    font-size: 10px;
    font-weight: bold;
    padding: 3px;
    border: 1px solid black;
    border-radius: 5px;
    cursor: pointer;
  }
  .cfa-container {
    display: flex;
    flex-wrap: wrap;
    margin-left: 10px;
  }
  .cfa-item {
    flex: 0 50%
  }
  .cfa-ach-container {
    padding: 10px;
    border-radius: 5px;
  }
  .cfa-ach-container-clickable {
    cursor: pointer;
    transition: background 150ms;
  }
  .cfa-ach-container-clickable:hover {
    background: #f3f3f3;
  }
  .cfa-ach-container-inner {
    display: flex;
    align-items: center;
  }
  .cfa-ach-icon {
    width: 60px;
    height: 60px;
    border-radius: 2px;
  }
  .cfa-ach-icon-common {
    box-shadow: 0 0 4px #aaa;
  }
  .cfa-ach-icon-rare {
    box-shadow: 0 0 4px #f66;
  }

  /* rare animation */
  .cfa-ach-icon-rare {
    position: relative;
  }
  .cfa-icon-bar {
    position: absolute;
    top: -2px;
    bottom: -2px;
    left: -2px;
    right: -2px;
    background-image: linear-gradient(180deg, #f66 30%, transparent 50%);
    background-repeat: no-repeat;
    background-size: 2px 200%;
    border-radius: 2px;
    filter: drop-shadow(0 0 2px #f66);
    animation: rare-anim var(--rare-anim-duration) linear infinite;
  }
  .cfa-top {
    transform: rotate(90deg);
    animation-delay: calc(-0.5 * var(--rare-anim-duration));
  }
  .cfa-right {
    transform: rotate(180deg);
    animation-delay: calc(-1 * var(--rare-anim-duration));
  }
  .cfa-bottom {
    transform: rotate(270deg);
    animation-delay: calc(-1.5 * var(--rare-anim-duration));
  }
  @keyframes rare-anim {
    0% {
      background-position: 0 -100%;
    }
    100% {
      background-position: 0 100%;
    }
  }
  /* rare animation end */

  .cfa-ach-icon-img {
    max-width: 100%;
    max-height: 100%;
  }
  .cfa-ach-info {
    margin-left: 18px;
  }
  .cfa-ach-mul {
    background-color: #333;
    color: white;
    padding: 0 4px;
    border-radius: 5px;
  }
  .cfa-ach-title {
    font-size: 13px;
    margin-bottom: 5px;
  }
  .cfa-ach-title-text {
    font-weight: bold;
  }
  .cfa-ach-brief {
    font-size: 12px;
  }
  .cfa-ach-popup-container {
    margin: 15px;
    width: 500px;
    max-height: 600px;
    overflow: auto;
  }
  .cfa-ach-popup-user-stats,
  .cfa-ach-popup-ach-desc {
    margin-top: 5px;
  }
  .cfa-ach-popup-grant-container {
    margin-top: 5px;
    list-style: initial;
    padding-left: 20px;
  }
  .cfa-popup-heading-container {
    margin: 10px;
  }
`;

export interface AchievementBriefTmplContext {
  clickable: boolean;
  isRare: boolean;
  iconUrl: string;
  title: string;
  mul: number | null;
  usersAwardedPercent: string;
  brief: string;
}

const achievementBriefTmpl = `
  <div class="cfa-item">
    <div class="cfa-ach-container {{#clickable}} cfa-ach-container-clickable {{/clickable}}">
      <div class="cfa-ach-container-inner">
        <div>
          <!--
            Not sure why but without this extra div the next div doesn't respect fixed width
            for the first ach on zooming in.
          -->
          {{#isRare}}
          <div class="cfa-ach-icon cfa-ach-icon-rare">
            <div class="cfa-icon-bar cfa-left"></div>
            <div class="cfa-icon-bar cfa-top"></div>
            <div class="cfa-icon-bar cfa-right"></div>
            <div class="cfa-icon-bar cfa-bottom"></div>
          {{/isRare}}
          {{^isRare}}
          <div class="cfa-ach-icon cfa-ach-icon-common">
          {{/isRare}}
            <img class="cfa-ach-icon-img" src="{{iconUrl}}" alt="icon">
          </div>
        </div>
        <div class="cfa-ach-info">
          <div class="cfa-ach-title">
            <span class="cfa-ach-title-text">{{title}}</span>
            {{#mul}}
            <span class="cfa-ach-mul">x{{mul}}</span>
            {{/mul}}
            <span>({{usersAwardedPercent}})</span>
          </div>
          <div class="cfa-ach-brief">
            {{brief}}
          </div>
        </div>
      </div>
    </div>
  </div>
`;

export interface AchievementsBoxTmplContext {
  achievements: AchievementBriefTmplContext[];
}

export const diffsBtnCls = "cfa-diffs-btn";

export function renderAchievementsBox(
  context: AchievementsBoxTmplContext,
): string {
  const tmpl = `
    <div id="cfa-root" class="roundbox">
      <div class="roundbox-lt">&nbsp;</div>
      <div class="roundbox-rt">&nbsp;</div>
      <div class="roundbox-lb">&nbsp;</div>
      <div class="roundbox-rb">&nbsp;</div>
      <div class="cfa-heading-container">
        <div class="cfa-heading-item">
          <div class="cfa-heading">Achievements</div>
        </div>
        <div class="cfa-heading-item">
          <div class="cfa-diffs-btn cfa-hidden">UPD!</div>
        </div>
      </div>
      <div class="cfa-container">
        {{#achievements}}
          {{> achievementBriefTmpl}}
        {{/achievements}}
      </div>
    </div>
  `;
  return Mustache.render(tmpl, context, { achievementBriefTmpl });
}

export interface AchievementPopupTmplContext {
  title: string;
  mul: number | null;
  usersAwarded: string;
  usersAwardedPercent: string;
  description: string;
  grantInfos: string[];
}

export function renderAchievementPopup(
  context: AchievementPopupTmplContext,
): string {
  const tmpl = `
    <div class="cfa-ach-popup-container">
      <div class="cfa-ach-popup-title">
        <span class="cfa-ach-title-text">{{title}}</span>
        {{#mul}}
        <span class="cfa-ach-mul">x{{mul}}</span>
        {{/mul}}
      </div>
      <div class="cfa-ach-popup-user-stats">
        Awarded to {{usersAwarded}} users ({{usersAwardedPercent}})
      </div>
      <div class="cfa-ach-popup-ach-desc">
        {{description}}
      </div>
      <ul class="cfa-ach-popup-grant-container">
        {{#grantInfos}}
        <li>{{.}}</li>
        {{/grantInfos}}
      </ul>
    </div>
  `;
  return Mustache.render(tmpl, context);
}

export interface AchievementDiffsTmplContext {
  anyAdded: boolean;
  added: AchievementBriefTmplContext[];
  anyRemoved: boolean;
  removed: AchievementBriefTmplContext[];
}

export function renderAchievementDiffs(
  context: AchievementDiffsTmplContext,
): string {
  const tmpl = `
    <div class="cfa-ach-popup-container">
      {{#anyAdded}}
      <div class="cfa-popup-heading-container">
        <div class="cfa-heading">Achievements added</div>
      </div>
      {{/anyAdded}}
      {{#added}}
        {{> achievementBriefTmpl}}
      {{/added}}
      {{#anyRemoved}}
      <div class="cfa-popup-heading-container">
        <div class="cfa-heading">Achievements removed</div>
      </div>
      {{/anyRemoved}}
      {{#removed}}
        {{> achievementBriefTmpl}}
      {{/removed}}
    </div>
  `;
  return Mustache.render(tmpl, context, { achievementBriefTmpl });
}
