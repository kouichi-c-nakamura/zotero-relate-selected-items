import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ReturnType<typeof createZToolkit>;
    locale?: {
      current: any;
    };
  };
  public hooks: typeof hooks;
  public api: object;
  private busy = false;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      initialized: false,
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    this.api = {};
  }

  private getSelectedRegularItems(): Zotero.Item[] {
    const pane = Zotero.getActiveZoteroPane();
    if (!pane) return [];
    return (pane.getSelectedItems() as Zotero.Item[]).filter(
      (item) => item.isRegularItem && item.isRegularItem(),
    );
  }

  private async updateRelations(mode: "add" | "remove"): Promise<void> {
    if (this.busy) return;
    const items = this.getSelectedRegularItems();
    if (items.length < 2) return;

    this.busy = true;
    try {
      // 1つのトランザクションにまとめ、中では saveTx ではなく save を使う
      await Zotero.DB.executeTransaction(async () => {
        for (const a of items) {
          let changed = false;
          for (const b of items) {
            if (a.id === b.id || a.libraryID !== b.libraryID) continue;
            const r =
              mode === "add" ? a.addRelatedItem(b) : a.removeRelatedItem(b);
            changed = changed || !!r;
          }
          if (changed) await a.save();
        }
      });

      const pw = new Zotero.ProgressWindow({ closeOnClick: true });
      pw.changeHeadline(
        mode === "add" ? "Relate Selected Items" : "Unrelate Selected Items",
      );
      pw.addDescription(
        mode === "add"
          ? `Linked ${items.length} items to each other.`
          : "Removed relations between selected items.",
      );
      pw.show();
      pw.startCloseTimer(3000);
    } catch (e: any) {
      Zotero.logError(e);
      const win = Zotero.getMainWindow();
      if (win) Zotero.alert(win, "Relation Error", `${e.message}`);
    } finally {
      this.busy = false;
    }
  }

  public relateSelectedItems(): Promise<void> {
    return this.updateRelations("add");
  }

  public unrelateSelectedItems(): Promise<void> {
    return this.updateRelations("remove");
  }
}

export default Addon;