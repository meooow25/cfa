// ==UserScript==
// @name        [WIP] Codeforces Achievements
// @namespace   https://github.com/meooow25
// @match       *://*.codeforces.com/*
// @grant       GM.xmlHttpRequest
// @grant       GM.setValue
// @grant       GM.getValue
// @version     0.1.0
// @author      meooow
// @description Shows unofficial Codeforces achievements
// @require     https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.min.js
// ==/UserScript==

(async function() {
  'use strict';

  const LOCAL = true;
  const DEBUG = true;

  const API_URL_BASE = LOCAL
      ? 'http://localhost:4908/ach/'
      : 'https://cfa-api.azurewebsites.net/api/ach/';
  const REFRESH_INTERVAL = LOCAL ? 60 * 1000 : 60 * 60 * 1000; // 60 s / 1 h
  const wrap = log => (...args) => log('[cfa]', ...args);
  const Log = {
    debug: DEBUG ? wrap(console.debug) : () => {},
    info: wrap(console.info),
    error: wrap(console.error),
  };

  // From https://stackoverflow.com/a/35385518
  function htmlToElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  async function fetchAchievements(handle) {
    const url = API_URL_BASE + handle;
    return new Promise((res, rej) => {
      GM.xmlHttpRequest({
        url,
        method: 'GET',
        onload: (response) => {
          if (response.status === 200) {
            res(JSON.parse(response.responseText));
          } else {
            rej(response);
          }
        }
      });
    });
  }

  function getLoggedInUser() {
    const el = document.querySelector('#header').querySelector('[href^="/profile"]');
    return el ? el.textContent : null;
  }
  const loggedInUser = getLoggedInUser();
  Log.info('Logged in user:', loggedInUser);

  function createStorage(keys) {
    const o = {};
    for (const key of keys) {
      o[key] = {
        async get(default_)  {
          return await GM.getValue(key, default_);
        },
        async set(value) {
          return await GM.setValue(key, value);
        }
      };
    }
    return o;
  }
  const Storage = createStorage([
    'loggedInUser',
    'currentAchievements',
    'pendingAchievements',
    'lastUpdated',
  ]);
  Log.debug(Storage);

  function calculateDiffs(achsA, achsB) {

    function notInAButInB(achsA, achsB) {
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

    const diffs = {
      added: notInAButInB(achsA, achsB),
      removed: notInAButInB(achsB, achsA),
    };
    diffs.changed = Boolean(diffs.added.length || diffs.removed.length);

    return diffs;
  }

  function showInFacebox(html) {
    // Codeforces uses this facebox
    $.facebox.loading();
    $.facebox.reveal(htmlToElement(html));
  }

  async function maybeCacheForLoggedInUser() {
    if (!loggedInUser) {
      return;
    }

    const lastLoggedInUser = await Storage.loggedInUser.get();
    if (!lastLoggedInUser || lastLoggedInUser !== loggedInUser) {
      await Storage.currentAchievements.set(null);
      await Storage.pendingAchievements.set(null);
      await Storage.loggedInUser.set(loggedInUser);
    }

    async function maybeRefresh() {
      const now = Date.now();
      const lastUpdated = await Storage.lastUpdated.get(0);
      if (now - lastUpdated >= REFRESH_INTERVAL) {
        Log.debug('Fetching achievements');
        const details = await fetchAchievements(loggedInUser);
        Log.debug('Fetched', details);
        await Storage.pendingAchievements.set(details);
        await Storage.lastUpdated.set(now);
      }
      const pending = await Storage.pendingAchievements.get();
      const current = await Storage.currentAchievements.get();
      if (!current) {
        // No achievements saved, first time.
        await Storage.currentAchievements.set(pending);
        Log.info('Saved achievements for the first time');
        return;
      }
      const diffs = calculateDiffs(current.achievements, pending.achievements);
      if (diffs.changed) {
        const currentTitles = current.achievements.map(ach => ach.title);
        const pendingTitles = pending.achievements.map(ach => ach.title);
        Log.info('Achievements updated', currentTitles, pendingTitles);
        Codeforces.showMessage('Your achievements have been updated. Visit your profile to see the changes!');
      } else {
        Log.debug('Achievements not changed');
      }
    }

    async function refreshTask() {
      try {
        await maybeRefresh();
      } catch (e) {
        Log.error(e);
      }
      setTimeout(refreshTask, REFRESH_INTERVAL);
    }
    refreshTask();
  }

  async function updateProfilePageWithAchievements() {
    const CSS = `
    #cfa-root {
      padding: 1em;
      margin-top: 1em;
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
      padding: 5px;
      border-radius: 5px;
      transition: background 150ms;
    }
    .cfa-ach-container-clickable {
      cursor: pointer;
    }
    .cfa-ach-container-clickable:hover {
      background: #f3f3f3;
    }
    .cfa-ach-container-inner {
      display: flex;
      align-items: center;
    }
    .cfa-ach-icon {
      margin-right: 15px;
      border-radius: 5px;
    }
    .cfa-ach-icon-rare {
      box-shadow: 0 0 5px #f33;
    }
    .cfa-ach-icon-img {
      width: 60px;
      height: 60px;
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
    .cfa-ach-info {
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

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    Handlebars.registerPartial(
      'achievement_template',
      `<div class="cfa-item">
        {{#if clickable}}
        <div class="cfa-ach-container cfa-ach-container-clickable">
        {{else}}
        <div class="cfa-ach-container">
        {{/if}}
          <div class="cfa-ach-container-inner">
            {{#if is_rare}}
            <div class="cfa-ach-icon cfa-ach-icon-rare">
            {{else}}
            <div class="cfa-ach-icon">
            {{/if}}
              <img class="cfa-ach-icon-img" src="{{{icon_url}}}" alt="icon">
            </div>
            <div class="cfa-ach-info">
              <div class="cfa-ach-title">
                <span class="cfa-ach-title-text">{{title}}</span>
                {{#if show_mul}}
                <span class="cfa-ach-mul">x{{mul}}</span>
                {{/if}}
                <span>({{users_awarded_percent}}%)</span>
              </div>
              <div class="cfa-ach-info">
                 {{brief}}
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const ACHIEVEMENTS_BOX_TEMPLATE = Handlebars.compile(`
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
          {{#each achievements}}
            {{> achievement_template }}
          {{/each}}
        </div>
      </div>
    `);

    const POPUP_TEMPLATE = Handlebars.compile(`
      <div class="cfa-ach-popup-container">
        <div class="cfa-ach-popup-title">
          <span class="cfa-ach-title-text">{{title}}</span>
          {{#if show_mul}}
          <span class="cfa-ach-mul">x{{mul}}</span>
          {{/if}}
        </div>
        <div class="cfa-ach-popup-user-stats">
          Awarded to {{users_awarded}} users ({{users_awarded_percent}}%)
        </div>
        <div class="cfa-ach-popup-ach-desc">
          {{description}}
        </div>
        <ul class="cfa-ach-popup-grant-container">
          {{#each grant_infos}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
    `);

    const DIFFS_TEMPLATE = Handlebars.compile(`
      <div class="cfa-ach-popup-container">
        <div class="cfa-popup-heading-container">
          <div class="cfa-heading">Achievements added</div>
        </div>
        {{#each added}}
          {{> achievement_template }}
        {{/each}}
        <div class="cfa-popup-heading-container">
          <div class="cfa-heading">Achievements removed</div>
        </div>
        {{#each removed}}
          {{> achievement_template }}
        {{/each}}
      </div>
    `);

    const handle = document.querySelector('.info .rated-user').textContent.trim();
    const details = await fetchAchievements(handle);

    function createTemplateContexts(ach, clickable=true) {
      const users_awarded_percent = (ach.users_awarded_fraction * 100).toFixed(2);
      const show_mul = ach.grant_infos.length > 1;
      const mul = ach.grant_infos.length;
      return {
        standard: {
          is_rare: ach.users_awarded_fraction <= 0.001,
          icon_url: ach.icon_url,
          title: ach.title,
          show_mul,
          mul,
          users_awarded_percent,
          brief: ach.brief,
          clickable,
        },
        detailed: {
          title: ach.title,
          show_mul,
          mul,
          users_awarded: ach.users_awarded,
          users_awarded_percent,
          description: ach.description,
          grant_infos: ach.grant_infos,
        },
      };
    }

    function showAchievementsBox() {
      // Rarer achievements first
      details.achievements.sort((a, b) => a.users_awarded - b.users_awarded);

      const achievments_box_template_data = { achievements: [] };
      const popup_template_data = [];
      for (const ach of details.achievements) {
        const {standard, detailed} = createTemplateContexts(ach);
        achievments_box_template_data.achievements.push(standard);
        popup_template_data.push(detailed);
      }

      const rendered = ACHIEVEMENTS_BOX_TEMPLATE(achievments_box_template_data);

      const el = htmlToElement(rendered);
      el.querySelectorAll('.cfa-ach-container')
        .forEach((el, idx) => {
          el.addEventListener('click', () => {
            const rendered = POPUP_TEMPLATE(popup_template_data[idx]);
            showInFacebox(rendered);
          });
        });

      document.querySelector('#pageContent').appendChild(el);
    }

    async function maybeShowUpdatesForLoggedInUser() {
      if (!loggedInUser || handle !== loggedInUser) {
        return;
      }
      const current = await Storage.currentAchievements.get();
      if (!current) {
        // No achievements saved, first time.
        await Storage.currentAchievements.set(details);
        return;
      }
      const diffs = calculateDiffs(current.achievements, details.achievements);
      if (!diffs.changed) {
        Log.debug('Achievements not changed');
        return;
      }

      Log.debug('Achievements changed, setting up diff button');
      const diffsForTemplate = {added: [], removed: []};
      for (const ach of diffs.added) {
        const {standard} = createTemplateContexts(ach, false);
        diffsForTemplate.added.push(standard);
      }
      for (const ach of diffs.removed) {
        const {standard} = createTemplateContexts(ach, false);
        diffsForTemplate.removed.push(standard);
      }

      let currentSaved = false;
      const diffsBtn = document.querySelector('.cfa-diffs-btn');
      diffsBtn.classList.remove('cfa-hidden');
      diffsBtn.addEventListener('click', async () => {
        const rendered = DIFFS_TEMPLATE(diffsForTemplate);
        showInFacebox(rendered);
        if (!currentSaved) {
          await Storage.currentAchievements.set(details);
          currentSaved = true;
        }
      });
    }

    showAchievementsBox();
    maybeShowUpdatesForLoggedInUser();
  }

  // TODO: Needs more work
  maybeCacheForLoggedInUser();

  if (/^\/profile/.test(location.pathname)) {
    updateProfilePageWithAchievements();
  }
})();
