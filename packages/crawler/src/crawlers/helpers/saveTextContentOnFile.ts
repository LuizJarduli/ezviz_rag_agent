import fs from "node:fs";
import path from "path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { checkFileExists } from "./checkFileExists.js";

export const saveTextContentOnFile = async (
  filePath: string,
  content: string,
) => {
  const directory = path.dirname(filePath);
  await fs.promises.mkdir(directory, { recursive: true });

  if (await checkFileExists(filePath)) {
    console.log("File already exists: ", filePath);
    return;
  }

  const turndownService = new TurndownService();
  turndownService.use(gfm);

  turndownService.addRule("breadcrumbs", {
    filter: (node) => {
      return (
        node.nodeName === "DIV" && node.classList.contains("ezd-breadcrumb")
      );
    },
    replacement: (content) => {
      return `> ${content.trim()}\n\n`;
    },
  });

  const markdown = turndownService.turndown(content);

  await fs.promises.writeFile(filePath, markdown, "utf-8");
};
