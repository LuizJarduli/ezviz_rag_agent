import { chromium, Locator, Page } from "playwright";
import { saveTextContentOnFile } from "./helpers/saveTextContentOnFile.js";
import {
  DOC_CONTENT_SELECTOR,
  USER_AGENT,
  SDK_DOCS_URL,
  SIDE_MENU_SELECTOR,
  AVOID_PARENTS,
  AVOID_NON_SDK_DOCS,
} from "./constants/constants.js";

const nestingUntilOnlyChild = async (
  page: Page,
  locator: Locator,
  level: number = 2,
  sectionPath: string = "",
) => {
  const sideMenuSideMenus = locator.locator(`li[class*=level${level}]`);
  const sideMenuSideMenusCount = await sideMenuSideMenus.count();

  if (sideMenuSideMenusCount === 0) {
    return;
  }

  for (let i = 0; i < sideMenuSideMenusCount; i++) {
    const sideMenuSideMenu = sideMenuSideMenus.nth(i);
    const sideMenuSideMenuText = await sideMenuSideMenu
      .locator(".ezd-menu-title-content")
      .textContent();

    if (
      AVOID_PARENTS.includes(sideMenuSideMenuText ?? "") ||
      AVOID_NON_SDK_DOCS.includes(sideMenuSideMenuText ?? "")
    ) {
      continue;
    }

    console.log("Accessing menu: ", sideMenuSideMenuText);

    await sideMenuSideMenu.click();
    await page.waitForLoadState("networkidle");

    const docContent = await page.locator(DOC_CONTENT_SELECTOR).innerHTML();

    await saveTextContentOnFile(
      `./docs/sdk/${sectionPath ? sectionPath + "/" : ""}${sideMenuSideMenuText}.md`,
      docContent || "",
    );

    await nestingUntilOnlyChild(
      page,
      sideMenuSideMenu,
      level + 1,
      sectionPath + "/" + sideMenuSideMenuText,
    );
  }
};

const crawl = async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ userAgent: USER_AGENT });
  await page.goto(SDK_DOCS_URL, { waitUntil: "networkidle", timeout: 60000 });
  const sideMenu = await page.locator(SIDE_MENU_SELECTOR);
  await nestingUntilOnlyChild(page, sideMenu);
  await browser.close();
  console.log("\t -- All SDK pages crawled successfully! Bravo vince");
};

crawl();
