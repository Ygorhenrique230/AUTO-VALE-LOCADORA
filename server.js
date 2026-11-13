"use strict";
const fs = require("node:fs");
const express = require("express");
const session = require("express-session");
const config = require("./src/config");
const { securityHeaders } = require("./src/middleware");
const { createRouter, errorHandler } = require("./src/routes");
const { JsonVehicleRepository } = require("./src/vehicleRepository");
const { DiskPhotoStorage } = require("./src/photoStorage");
const { VehicleService } = require("./src/vehicleService");

fs.mkdirSync(config.uploadsDir, { recursive: true });

const service = new VehicleService(
  new JsonVehicleRepository(config.dataFile),
  new DiskPhotoStorage(config.uploadsDir)
);

const app = express();
if (config.isProduction) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(express.json({ limit: "10kb" }));
app.use(session({
  name: "autovale.sid",
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: config.isProduction, maxAge: 8 * 60 * 60 * 1000 },
}));

app.use("/api", createRouter(service));
app.use("/uploads", express.static(config.uploadsDir, { maxAge: "7d", index: false }));
app.use(express.static(config.publicDir));
app.use(errorHandler);

app.listen(config.port, () => console.log(`Auto Vale rodando em http://localhost:${config.port}`));