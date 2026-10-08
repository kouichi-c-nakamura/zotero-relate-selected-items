import { initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";

const RELATE_ID = "menuitem-relate-selected";
const UNRELATE_ID = "menuitem-unrelate-selected";

// ウィンドウごとの後始末用
const cleanups = new WeakMap<Window, () => void>();

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  addon.data.initialized = true;
}

function createMenuItem(doc: any, id: string, label: string, onCommand: () => void) {
  const el = doc.createXULElement
    ? doc.createXULElement("menuitem")
    : doc.createElement("menuitem");
  el.id = id;
  el.setAttribute("label", label);
  el.addEventListener("command", onCommand);
  return el;
}

export function onMainWindowLoad(win: Window): void {
  const doc = win.document as any;
  const itemMenu = doc.getElementById("zotero-itemmenu");
  if (!itemMenu) return;

  // 前回ロード時の項目・リスナーが残っていれば先に片付ける
  cleanups.get(win)?.();
  doc.getElementById(RELATE_ID)?.remove();
  doc.getElementById(UNRELATE_ID)?.remove();

  const relateItem = createMenuItem(
    doc,
    RELATE_ID,
    "Relate Selected Items to Each Other",
    () => {
      addon.relateSelectedItems();
    },
  );
  const unrelateItem = createMenuItem(
    doc,
    UNRELATE_ID,
    "Unrelate Selected Items from Each Other",
    () => {
      addon.unrelateSelectedItems();
    },
  );
  itemMenu.appendChild(relateItem);
  itemMenu.appendChild(unrelateItem);

  // 表示切り替えのみ（項目の生成はしない）
  const onPopupShowing = () => {
    const pane = Zotero.getActiveZoteroPane();
    const count = pane
      ? pane
        .getSelectedItems()
        .filter((i: any) => i.isRegularItem && i.isRegularItem()).length
      : 0;
    relateItem.hidden = count < 2;
    unrelateItem.hidden = count < 2;
  };
  itemMenu.addEventListener("popupshowing", onPopupShowing);

  cleanups.set(win, () => {
    itemMenu.removeEventListener("popupshowing", onPopupShowing);
    relateItem.remove();
    unrelateItem.remove();
  });
}

async function onMainWindowUnload(win: Window): Promise<void> {
  cleanups.get(win)?.();
  cleanups.delete(win);
  addon.data.ztoolkit.unregisterAll();
}

function onShutdown(): void {
  for (const win of Zotero.getMainWindows()) {
    cleanups.get(win)?.();
    cleanups.delete(win);
  }
  addon.data.ztoolkit.unregisterAll();
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

async function onNotify() { }
async function onPrefsEvent() { }
function onShortcuts() { }
function onDialogEvents() { }

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
};