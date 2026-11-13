"use strict";
const crypto = require("node:crypto");
const multer = require("multer");
const config = require("./config");
const { ValidationError } = require("./errors");

/* ---------- Security headers ---------- */
function securityHeaders(_req, res, next) {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
}

/* ---------- Authentication ---------- */
const digest = (value) => crypto.createHash("sha256").update(String(value ?? "")).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function verifyCredentials(username, password) {
  const userMatches = safeEqual(username, config.adminUser);
  const passwordMatches = safeEqual(password, config.adminPassword);
  return userMatches && passwordMatches;
}

function requireAuth(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ error: "Sessão expirada. Entre novamente." });
}

/* ---------- Login rate limit (5 failures per 15 minutes per IP) ---------- */
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();

function isRateLimited(ip) {
  const entry = failures.get(ip);
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(ip, { count: 0, resetAt: Date.now() + WINDOW_MS });
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function registerFailure(ip) {
  const entry = failures.get(ip);
  if (entry) entry.count += 1;
}

/* ---------- Photo upload (JPG, PNG or WebP, up to 5 MB; random file names) ---------- */
const EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const uploadPhoto = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, config.uploadsDir),
    filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: config.maxPhotoBytes, files: 1, fields: 10 },
  fileFilter: (_req, file, callback) =>
    EXTENSIONS[file.mimetype]
      ? callback(null, true)
      : callback(new ValidationError("Formato de foto inválido. Use JPG, PNG ou WebP.")),
}).single("photo");

module.exports = { securityHeaders, verifyCredentials, requireAuth, isRateLimited, registerFailure, uploadPhoto };