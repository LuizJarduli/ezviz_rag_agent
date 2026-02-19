import { chromium } from "playwright";

const SDK_DOCS_URL = "https://open.ys7.com/help/4366";
const SIDE_MENU_SELECTOR = "#left-nav > ul.ezd-menu";
const DOC_CONTENT_SELECTOR = "#mian-section > div.main > div.doc > div";
const BREADCRUMBS_SELECTOR =
  "#mian-section > div.main > div.doc > div > div.custom-html-style > div.ezd-breadcrumb";

const crawl = async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(SDK_DOCS_URL, { waitUntil: "networkidle" });

  const sideMenu = await page.locator(SIDE_MENU_SELECTOR);
  const sideMenuSideMenus = sideMenu.locator("li");
  const sideMenuSideMenusCount = await sideMenuSideMenus.count();

  for (let i = 0; i < sideMenuSideMenusCount; i++) {
    const sideMenuSideMenu = sideMenuSideMenus.nth(i);
    const sideMenuSideMenuText = await sideMenuSideMenu
      .locator(".ezd-menu-title-content")
      .textContent();

    console.log("Accessing menu: ", sideMenuSideMenuText);
    await sideMenuSideMenu.click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState("networkidle");

    const docBreadcrumbs = await page.locator(BREADCRUMBS_SELECTOR);
    const docBreadcrumbsItems = await docBreadcrumbs.locator(
      ".ezd-breadcrumb-link",
    );
    const docBreadcrumbsItemsCount = await docBreadcrumbsItems.count();

    for (let j = 0; j < docBreadcrumbsItemsCount; j++) {
      const docBreadcrumbsItem = docBreadcrumbsItems.nth(j);
      const docBreadcrumbsItemText = await docBreadcrumbsItem.textContent();
      console.log("Doc breadcrumbs scraped: ", docBreadcrumbsItemText);
    }
  }

  await browser.close();
};

crawl();
