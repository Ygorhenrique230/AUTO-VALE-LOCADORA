"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

class DiskPhotoStorage {
  constructor(directory) {
    this.directory = directory;
  }

  async remove(filename) {
    if (!filename) return;
    try {
      await fs.unlink(path.join(this.directory, path.basename(filename)));
    } catch (error) {
      if (error.code !== "ENOENT") console.error("Falha ao remover foto:", error);
    }
  }
}

module.exports = { DiskPhotoStorage };