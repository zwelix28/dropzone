import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { mkdirSync } from "fs";
import { MongoClient } from "mongodb";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "uploads", "tracks");
mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const ext = path.extname(file.originalname) || ".mp3";
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 80) * 1024 * 1024 },
});

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/files", express.static(uploadDir));

let mongoClient;
let mongoDb;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (!mongoDb) {
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    mongoDb = mongoClient.db(process.env.MONGODB_DB || "dropzone_dj");
  }
  return mongoDb;
}

const port = Number(process.env.PORT || 3001);
const publicBase = (process.env.PUBLIC_API_URL || `http://localhost:${port}`).replace(/\/$/, "");

app.post("/api/dj/tracks", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "file required (field name: file)" });
    const rel = `/files/${req.file.filename}`;
    const url = `${publicBase}${rel}`;
    const db = await getDb();
    let id = req.file.filename;
    if (db) {
      const ins = await db.collection("dj_tracks").insertOne({
        originalName: req.file.originalname,
        storedName: req.file.filename,
        url,
        mime: req.file.mimetype,
        size: req.file.size,
        createdAt: new Date(),
      });
      id = ins.insertedId.toString();
    }
    res.json({ ok: true, id, storedName: req.file.filename, url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post("/api/dj/mixes", async (req, res) => {
  try {
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Set MONGODB_URI to enable mix metadata storage" });
    const doc = {
      ...req.body,
      createdAt: new Date(),
    };
    const ins = await db.collection("dj_mixes").insertOne(doc);
    res.json({ ok: true, id: ins.insertedId.toString() });
  } catch (e) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, mongo: Boolean(process.env.MONGODB_URI) });
});

app.listen(port, () => {
  console.log(`Dropzone DJ API listening on http://localhost:${port}`);
  console.log(`Tracks: POST /api/dj/tracks (multipart field "file")`);
  console.log(`Mixes:  POST /api/dj/mixes (JSON body, requires MongoDB)`);
});
