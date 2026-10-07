import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
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
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
  };
  public hooks: typeof hooks;
  public api: object;

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

  public async relateSelectedItems(): Promise<void> {
    const pane = Zotero.getActiveZoteroPane();
    if (!pane) return;

    // レギュラーアイテムのみ抽出
    const items = (pane.getSelectedItems() as Zotero.Item[]).filter(
      (item) => item.isRegularItem && item.isRegularItem()
    );

    if (items.length < 2) {
      const win = Zotero.getMainWindow();
      if (win) {
        Zotero.alert(
          win,
          "Relate Selected Items",
          "Please select at least 2 regular items to link."
        );
      }
      return;
    }

    await Zotero.DB.executeTransaction(async () => {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          // 型定義に合わせて Item オブジェクトを渡す
          items[i].addRelatedItem(items[j]);
        }
        await items[i].saveTx();
      }
    });

    const progressWin = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWin.changeHeadline("Relate Selected Items");
    progressWin.addDescription(
      `Successfully linked ${items.length} items to each other.`
    );
    progressWin.show();
    progressWin.startCloseTimer(3000);
  }
}

export default Addon;