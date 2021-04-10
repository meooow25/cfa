/**
 * Type definition for the GM global object.
 * 
 * https://wiki.greasespot.net/Greasemonkey_Manual:API
 * https://violentmonkey.github.io/api/gm/
 * https://www.tampermonkey.net/documentation.php
 */
export interface GM extends GmXmlHttpRequest, GmSetGetValue {
}

export interface GmSetGetValue {
  setValue?(key: string, value: string): Promise<void>;
  getValue?(key: string): Promise<string>;
}

export interface GmXmlHttpRequest {
  xmlHttpRequest?(details: RequestDetails): void;
}

export interface RequestDetails {
  url: string;
  method?: string;
  timeout?: number;
  onload?(response: ResponseDetails): void;
  onerror?(): void;
  ontimeout?(): void;
}

export interface ResponseDetails {
  status: number;
  statusText: string;
  responseText: string;
}

/**
 * Returns the GM object, polyfilling it if the API is GM3 instead of GM4.
 * 
 * Everything is expected to work for the most popular userscript managers,
 * Geasemonkey, Violentmonkey, and Tampermonkey. All of them support XHR and
 * set/getValue.
 */
export function initAndGetGM(): GM {
  const win: any = window;
  const gm: GM = win.GM ?? {};

  if (!gm.xmlHttpRequest && win.GM_xmlhttpRequest) {
    gm.xmlHttpRequest = win.GM_xmlhttpRequest;
  }

  if ((!gm.setValue || !gm.getValue) && win.GM_setValue && win.GM_getValue) {
    gm.setValue = (key, value) => {
      win.GM_setValue(key, value);
      return Promise.resolve();
    };
    gm.getValue = (key) => {
      return Promise.resolve(win.GM_getValue(key));
    };
  }

  return gm;
}
