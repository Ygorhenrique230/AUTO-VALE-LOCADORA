"use strict";
const { randomUUID } = require("node:crypto");
const { NotFoundError } = require("./errors");
const { validateVehicleInput } = require("./vehicleValidator");

const toDto = ({ photoFilename, ...vehicle }) => ({
  ...vehicle,
  photoUrl: photoFilename ? `/uploads/${photoFilename}` : null,
});

class VehicleService {
  constructor(repository, photoStorage) {
    this.repository = repository;
    this.photoStorage = photoStorage;
  }

  async list() {
    return (await this.repository.findAll()).map(toDto);
  }

  async create(rawInput, photoFilename) {
    try {
      const vehicle = {
        id: randomUUID(),
        ...validateVehicleInput(rawInput),
        photoFilename: photoFilename ?? null,
        updatedAt: new Date().toISOString(),
      };
      await this.repository.transaction((vehicles) => { vehicles.push(vehicle); });
      return toDto(vehicle);
    } catch (error) {
      await this.photoStorage.remove(photoFilename);
      throw error;
    }
  }

  async update(id, rawInput, newPhotoFilename) {
    let replacedPhoto = null;
    try {
      const input = validateVehicleInput(rawInput);
      const updated = await this.repository.transaction((vehicles) => {
        const vehicle = vehicles.find((item) => item.id === id);
        if (!vehicle) throw new NotFoundError("Veículo não encontrado.");
        if (newPhotoFilename) {
          replacedPhoto = vehicle.photoFilename;
          vehicle.photoFilename = newPhotoFilename;
        }
        Object.assign(vehicle, input, { updatedAt: new Date().toISOString() });
        return vehicle;
      });
      await this.photoStorage.remove(replacedPhoto);
      return toDto(updated);
    } catch (error) {
      await this.photoStorage.remove(newPhotoFilename);
      throw error;
    }
  }

  async remove(id) {
    const removed = await this.repository.transaction((vehicles) => {
      const index = vehicles.findIndex((item) => item.id === id);
      if (index === -1) throw new NotFoundError("Veículo não encontrado.");
      return vehicles.splice(index, 1)[0];
    });
    await this.photoStorage.remove(removed.photoFilename);
  }
}

module.exports = { VehicleService };