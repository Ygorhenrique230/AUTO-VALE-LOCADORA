"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");

class JsonVehicleRepository {
  #file;
  #queue = Promise.resolve();

  constructor(file) {
    this.#file = file;
  }

  async findAll() {
    try {
      return JSON.parse(await fs.readFile(this.#file, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  /** Read-modify-write executed one at a time, so concurrent edits never overwrite each other. */
  transaction(mutator) {
    const run = this.#queue.then(async () => {
      const vehicles = await this.findAll();
      const result = await mutator(vehicles);
      await this.#write(vehicles);
      return result;
    });
    this.#queue = run.catch(() => undefined);
    return run;
  }

  async #write(vehicles) {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    const temporaryFile = `${this.#file}.tmp`;
    await fs.writeFile(temporaryFile, JSON.stringify(vehicles, null, 2), "utf8");
    await fs.rename(temporaryFile, this.#file);
  }
}

module.exports = { JsonVehicleRepository };