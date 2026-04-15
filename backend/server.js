import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";

const incidents = [
  {
    id: 1,
    title: "Árbol caído",
    emoji: "🌳",
    lat: 3.4216,
    lng: -76.5441,
    zone: "Sur de Cali",
    severity: "alta",
    agency: "DAGMA",
    status: "Reportado",
  },
  {
    id: 2,
    title: "Semáforo dañado",
    emoji: "🚦",
    lat: 3.4516,
    lng: -76.5320,
    zone: "Centro",
    severity: "media",
    agency: "Secretaría de Movilidad",
    status: "En revisión",
  },
];

dotenv.config();

console.log("API KEY:", process.env.OPENAI_API_KEY);

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.OPENAI_API_KEY) {
  console.error("Falta OPENAI_API_KEY en el archivo .env");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function normalizeAgencyKey(value = "") {
  const key = String(value).toUpperCase().trim();

  if (["DAGMA", "BOMBEROS", "EMCALI", "MOVILIDAD", "INFRA"].includes(key)) {
    return key;
  }

  return "INFRA";
}

function normalizeSeverity(value = "") {
  const level = String(value).toLowerCase().trim();

  if (["alta", "media", "baja"].includes(level)) {
    return level;
  }

  return "media";
}

function normalizeCategory(value = "") {
  const category = String(value).toLowerCase().trim();

  if (
    [
      "ambiental",
      "emergencia",
      "electrico",
      "movilidad",
      "infraestructura",
      "general",
    ].includes(category)
  ) {
    return category;
  }

  return "general";
}

function normalizeConfidence(value) {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return 70;
  }

  if (num < 0) return 0;
  if (num > 100) return 100;

  return Math.round(num);
}

app.get("/", (req, res) => {
  res.send("InfraCali backend activo");
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "InfraCali backend con OpenAI activo",
    port: PORT,
  });
});

app.get("/api/incidents", (req, res) => {
  res.json(incidents);
});

app.post("/api/incidents", (req, res) => {
  const newIncident = {
    id: Date.now(),
    ...req.body,
    status: req.body.status || "Nuevo",
  };

  incidents.unshift(newIncident);
  res.status(201).json(newIncident);
});

app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
  console.log("Llego solicitud a /api/analyze-image");

  try {
    const title = (req.body.title || "").toLowerCase();
    const description = (req.body.description || "").toLowerCase();
    const place = req.body.place || "";
    const text = `${title} ${description}`.trim();

    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ninguna imagen." });
    }

    let result = {
      title: "Caso por validar",
      emoji: "📍",
      severity: "media",
      category: "general",
      agencyKey: "INFRA",
      confidence: 60,
      recommendation: "No se pudo clasificar con seguridad. Revisión manual recomendada.",
    };

    if (text.includes("arbol") || text.includes("árbol") || text.includes("rama")) {
      result = {
        title: "Árbol caído o riesgo ambiental",
        emoji: "🌳",
        severity: "alta",
        category: "ambiental",
        agencyKey: "DAGMA",
        confidence: 85,
        recommendation: "Reporta al DAGMA y evita mover el árbol si hay cables o riesgo.",
      };
    } else if (text.includes("fuego") || text.includes("incendio") || text.includes("humo")) {
      result = {
        title: "Incendio o emergencia activa",
        emoji: "🔥",
        severity: "alta",
        category: "emergencia",
        agencyKey: "BOMBEROS",
        confidence: 88,
        recommendation: "Aléjate del lugar y reporta de inmediato a Bomberos.",
      };
    } else if (
      text.includes("cable") ||
      text.includes("poste") ||
      text.includes("electrico") ||
      text.includes("eléctrico") ||
      text.includes("chispa")
    ) {
      result = {
        title: "Daño eléctrico",
        emoji: "⚡",
        severity: "alta",
        category: "electrico",
        agencyKey: "EMCALI",
        confidence: 84,
        recommendation: "Reporta a EMCALI y no toques cables ni zonas húmedas.",
      };
    } else if (text.includes("semaforo") || text.includes("semáforo") || text.includes("cruce")) {
      result = {
        title: "Falla en semáforo o cruce vial",
        emoji: "🚦",
        severity: "media",
        category: "movilidad",
        agencyKey: "MOVILIDAD",
        confidence: 83,
        recommendation: "Reporta a Movilidad y mantén precaución al cruzar.",
      };
    } else if (
      text.includes("hueco") ||
      text.includes("grieta") ||
      text.includes("puente") ||
      text.includes("anden") ||
      text.includes("andén")
    ) {
      result = {
        title: "Daño en infraestructura",
        emoji: "🏗️",
        severity: "media",
        category: "infraestructura",
        agencyKey: "INFRA",
        confidence: 82,
        recommendation: "Evita la zona si hay riesgo y reporta a Infraestructura.",
      };
    }

    return res.json({
      ...result,
      place,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Error analizando imagen:", error);

    return res.status(500).json({
      error: "Error interno al analizar la imagen.",
      detail: error?.message || "Error desconocido",
    });
  }
});

app.listen(PORT, () => {
  console.log(`InfraCali backend activo en http://localhost:${PORT}`);
});
