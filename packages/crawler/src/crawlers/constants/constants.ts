export const SDK_DOCS_URL = "https://open.ys7.com/help/4366";
export const SIDE_MENU_SELECTOR = "#left-nav > ul.ezd-menu.ezd-menu-root";
export const DOC_CONTENT_SELECTOR =
  "#mian-section > div.main > div.doc > div > div.custom-html-style";
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// TMP: menu UIKit 多语言/兼容性说明 / UIKit-js 海外&多语言 is bugged
// and duplicated, avoiding for now
export const AVOID_PARENTS = [
  "UIKit 多语言/兼容性说明",
  "UIKit-js 海外&多语言",
];

// TMP: menu UIKIT 标准流SDK支持H265集成说明 redirects to other route, breaks the script for SDK only
export const AVOID_NON_SDK_DOCS = ["UIKIT 标准流SDK支持H265集成说明"];
