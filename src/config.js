"use strict";
const path = require("node:path");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

const root = path.join(__dirname, "..");

module.exports = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === "production",
  adminUser: requireEnv("ADMIN_USER"),
  adminPassword: requireEnv("ADMIN_PASSWORD"),
  sessionSecret: requireEnv("SESSION_SECRET"),
  dataFile: path.join(root, "data", "vehicles.json"),
  uploadsDir: path.join(root, "uploads"),
  publicDir: path.join(root, "public"),
  maxPhotoBytes: 5 * 1024 * 1024,
});