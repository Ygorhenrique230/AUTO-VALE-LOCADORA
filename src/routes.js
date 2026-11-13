"use strict";
const express = require("express");
const multer = require("multer");
const { ValidationError, NotFoundError } = require("./errors");
const { verifyCredentials, requireAuth, isRateLimited, registerFailure, uploadPhoto } = require("./middleware");

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function createRouter(service) {
  const router = express.Router();

  // Public: the website reads the fleet from here
  router.get("/vehicles", asyncHandler(async (_req, res) => res.json(await service.list())));

  // Session
  router.post("/admin/login", (req, res) => {
    if (isRateLimited(req.ip)) {
      return res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
    }
    const { username, password } = req.body ?? {};
    if (!verifyCredentials(username, password)) {
      registerFailure(req.ip);
      return res.status(401).json({ error: "Usuário ou senha inválidos." });
    }
    return req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: "Falha ao iniciar a sessão." });
      req.session.isAdmin = true;
      return res.json({ ok: true });
    });
  });
  router.post("/admin/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));
  router.get("/admin/session", (req, res) => res.json({ authenticated: Boolean(req.session?.isAdmin) }));

  // Everything below requires login
  router.use("/admin", requireAuth);
  router.post("/admin/vehicles", uploadPhoto, asyncHandler(async (req, res) =>
    res.status(201).json(await service.create(req.body, req.file?.filename))));
  router.put("/admin/vehicles/:id", uploadPhoto, asyncHandler(async (req, res) =>
    res.json(await service.update(req.params.id, req.body, req.file?.filename))));
  router.delete("/admin/vehicles/:id", asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    res.status(204).end();
  }));

  return router;
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, _req, res, _next) {
  if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
  if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "A foto deve ter no máximo 5 MB." : "Falha no envio da foto.";
    return res.status(400).json({ error: message });
  }
  console.error(error);
  return res.status(500).json({ error: "Erro interno do servidor." });
}

module.exports = { createRouter, errorHandler };