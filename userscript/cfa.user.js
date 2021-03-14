// ==UserScript==
// @name        [WIP] Codeforces Achievements
// @namespace   https://github.com/meooow25
// @match       *://*.codeforces.com/profile/*
// @grant       GM.xmlHttpRequest
// @version     0.1.0
// @author      meooow
// @description Shows unofficial Codeforces achievements
// @require     https://cdnjs.cloudflare.com/ajax/libs/mustache.js/4.1.0/mustache.min.js
// ==/UserScript==

(async function() {
  'use strict';

  const LOCAL = true;
  const API_URL_BASE = LOCAL
      ? 'http://localhost:4908/ach/'
      : 'https://cfa-api.azurewebsites.net/api/ach/';

  const handle = document.querySelector('.info .rated-user').textContent.trim();
  const url = API_URL_BASE + handle;

  const details = await new Promise((res, rej) => {
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

  // From https://stackoverflow.com/a/35385518
  function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  const CSS = `
  #cfa-root {
    padding: 1em;
    margin-top: 1em;
  }
  .cfa-heading {
    font-size: 18px;
    font-weight: bold;
    margin: 5px 0 15px 10px;
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
    cursor: pointer;
  }
  .cfa-ach-container:hover {
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
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const TEMPLATE = `
  <div id="cfa-root" class="roundbox">
    <div class="roundbox-lt">&nbsp;</div>
    <div class="roundbox-rt">&nbsp;</div>
    <div class="roundbox-lb">&nbsp;</div>
    <div class="roundbox-rb">&nbsp;</div>
    <div class="cfa-heading">Achievements</div>
    <div class="cfa-container">
      {{#achievements}}
      <div class="cfa-item">
        <div class="cfa-ach-container">
          <div class="cfa-ach-container-inner">
            {{#is_rare}}
            <div class="cfa-ach-icon cfa-ach-icon-rare">
            {{/is_rare}}
            {{^is_rare}}
            <div class="cfa-ach-icon">
            {{/is_rare}}
              <img class="cfa-ach-icon-img" src="{{{icon_url}}}" alt="icon">
            </div>
            <div class="cfa-ach-info">
              <div class="cfa-ach-title">
                <span class="cfa-ach-title-text">{{title}}</span>
                {{#show_mul}}
                <span class="cfa-ach-mul">x{{mul}}</span>
                {{/show_mul}}
                <span>({{users_awarded_percent}}%)</span>
              </div>
              <div class="cfa-ach-info">
                 {{brief}}
              </div>
            </div>
          </div>
        </div>
      </div>
      {{/achievements}}
    </div>
  </div>`;

  const POPUP_TEMPLATE = `
  <div class="cfa-ach-popup-container">
    <div class="cfa-ach-popup-title">
      <span class="cfa-ach-title-text">{{title}}</span>
      {{#show_mul}}
      <span class="cfa-ach-mul">x{{mul}}</span>
      {{/show_mul}}
    </div>
    <div class="cfa-ach-popup-user-stats">
      Awarded to {{users_awarded}} users ({{users_awarded_percent}}%)
    </div>
    <div class="cfa-ach-popup-ach-desc">
      {{description}}
    </div>
    <ul class="cfa-ach-popup-grant-container">
      {{#grant_infos}}
      <li>{{.}}</li>
      {{/grant_infos}}
    </ul>
  </div>`;

  // Rarer achievements first
  details.achievements.sort((a, b) => a.users_awarded - b.users_awarded);

  const template_data = { achievements: [] };
  const popup_template_data = [];
  for (const ach of details.achievements) {
    const users_awarded_percent = (ach.users_awarded_fraction * 100).toFixed(2);
    const show_mul = ach.grant_infos.length > 1;
    const mul = ach.grant_infos.length;
    template_data.achievements.push({
      is_rare: ach.users_awarded_fraction <= 0.001,
      icon_url: ach.icon_url,
      title: ach.title,
      show_mul,
      mul,
      users_awarded_percent,
      brief: ach.brief,
    });
    popup_template_data.push({
      title: ach.title,
      show_mul,
      mul,
      users_awarded: ach.users_awarded,
      users_awarded_percent,
      description: ach.description,
      grant_infos: ach.grant_infos,
    });
  }

  function showPopup(idx) {
    const rendered = Mustache.render(POPUP_TEMPLATE, popup_template_data[idx]);

    // Codeforces uses this facebox
    $.facebox.loading();
    $.facebox.reveal(htmlToElement(rendered));
  }

  const rendered = Mustache.render(TEMPLATE, template_data);

  const el = htmlToElement(rendered);
  el.querySelectorAll('.cfa-ach-container')
    .forEach((el, idx) => el.addEventListener('click', () => showPopup(idx)));

  document.querySelector('#pageContent').appendChild(el);
})();
