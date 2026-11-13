"use strict";
const { ValidationError } = require("./errors");

function readText(value, label, { min = 1, max }) {
  const result = String(value ?? "").trim();
  if (result.length < min || result.length > max) {
    throw new ValidationError(`${label} deve ter entre ${min} e ${max} caracteres.`);
  }
  return result;
}

function readInteger(value, label, { min, max }) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new ValidationError(`${label} deve ser um número inteiro entre ${min} e ${max}.`);
  }
  return result;
}

/** @returns {{name:string, category:string, description:string, year:number, mileageKm:number, isAvailable:boolean}} */
function validateVehicleInput(raw = {}) {
  return {
    name: readText(raw.name, "Nome", { max: 60 }),
    category: readText(raw.category, "Categoria", { max: 30 }),
    description: readText(raw.description, "Descrição", { min: 0, max: 600 }),
    year: readInteger(raw.year, "Ano", { min: 1980, max: new Date().getFullYear() + 1 }),
    mileageKm: readInteger(raw.mileageKm, "Quilometragem", { min: 0, max: 2_000_000 }),
    isAvailable: raw.isAvailable === true || raw.isAvailable === "true",
  };
}

module.exports = { validateVehicleInput };