/**
 * Returns an Element constructed from the given string.
 * From https://stackoverflow.com/a/35385518
 */
export function htmlToElement(html: string): Element {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild as Element;
}

/** Inserts the given string as CSS into the document with the given ID. */
export function insertCss(css: string, id: string) {
  const el = document.createElement("style");
  el.textContent = css;
  el.id = id;
  document.head.appendChild(el);
}

/**
 * Returns the handle on the current /profile page on CF. Should be called only
 * on a /profile page.
 */
export function getHandleOnProfilePage(): string {
  return document.querySelector(".info .rated-user")!.textContent!.trim();
}

/** Returns the handle of the currently logged in user on CF. */
export function getLoggedInUser(): string | null {
  const el = document.querySelector("#header")!.querySelector(
    '[href^="/profile"]',
  );
  return el ? el.textContent : null;
}

// jQuery on Codeforces
declare const $: any;

/** Shows the given string as HTML in the Codeforces facebox. */
export function showInFacebox(html: string) {
  $.facebox.loading();
  $.facebox.reveal(htmlToElement(html));
}

// Codeforces global object
declare const Codeforces: any;

/** Shows a Codeforces toast with the given string. */
export function showToast(msg: string) {
  Codeforces.showMessage(msg);
}
