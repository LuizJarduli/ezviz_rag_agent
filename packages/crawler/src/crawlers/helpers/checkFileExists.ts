import fs from "node:fs";

export const checkFileExists = (filepath: string): Promise<boolean> => {
  return new Promise((resolve, _) => {
    fs.access(filepath, fs.constants.F_OK, (error) => {
      resolve(!error);
    });
  });
};
