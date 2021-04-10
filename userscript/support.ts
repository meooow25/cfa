import { GM } from "./gm.ts";

/** Contains information on whether userscript features are supported. */
export interface SupportInfo {
  essential: SupportItem;
  autoUpdate: SupportItem;
}

export interface SupportItem {
  ok: boolean;
  msg?: string;
}

export function checkSupport(gm: GM): SupportInfo {
  const essentialMsg =
    "This userscript cannot work. Please use a userscript manager that " +
    "supports GM.xmlHttpRequest / GM_xmlhttpRequest.";
  const essentialItem = gm.xmlHttpRequest
    ? { ok: true }
    : { ok: false, msg: essentialMsg };

  const autoUpdateMsg =
    "The userscript manager does not support GM.{set,get}Value / " +
    "GM_{set,get}Value. Notification for achievement changes for logged in " +
    "users will be disabled.";
  const autoUpdateItem = gm.getValue && gm.setValue
    ? { ok: true }
    : { ok: false, msg: autoUpdateMsg };

  return {
    essential: essentialItem,
    autoUpdate: autoUpdateItem,
  };
}
