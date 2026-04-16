import express from "express";
import cors from "cors";
import multer from "multer";

import dotenv from "dotenv";

import { InferenceClient } from "@huggingface/inference";

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

function mapIncidentFromVision({
  caption = "",
  detections = [],
  userText = "",
}) {
  const labels = detections.map((d) => d.label).join(" ");
  const text = `${caption} ${labels} ${userText}`.toLowerCase();

  console.log("TEXTO FINAL ANALIZADO:", text);

  // PRIORIDAD 1: semáforo / tránsito
  if (
    text.includes("traffic light") ||
    text.includes("trafficlight") ||
    text.includes("semaphore") ||
    text.includes("signal") ||
    text.includes("semaforo") ||
    text.includes("semáforo")
  ) {
    return {
      title: "Falla en semáforo o cruce vial",
      emoji: "🚦",
      severity: "media",
      category: "movilidad",
      agencyKey: "MOVILIDAD",
      confidence: 90,
      recommendation: "Reporta a Movilidad y mantén precaución al cruzar.",
    };
  }

  // PRIORIDAD 2: riesgo eléctrico / poste / cableado
  if (
    text.includes("pole") ||
    text.includes("utility pole") ||
    text.includes("electric pole") ||
    text.includes("wire") ||
    text.includes("wires") ||
    text.includes("cable") ||
    text.includes("cables") ||
    text.includes("electric") ||
    text.includes("electricity") ||
    text.includes("poste") ||
    text.includes("cableado") ||
    text.includes("post")
  ) {
    return {
      title: "Daño eléctrico",
      emoji: "⚡",
      severity: "alta",
      category: "electrico",
      agencyKey: "EMCALI",
      confidence: 88,
      recommendation: "Reporta a EMCALI y no toques cables ni zonas húmedas.",
    };
  }

  // PRIORIDAD 3: árbol / ramas
  if (
    text.includes("tree") ||
    text.includes("branch") ||
    text.includes("branches") ||
    text.includes("trunk") ||
    text.includes("arbol") ||
    text.includes("árbol") ||
    text.includes("rama") ||
    text.includes("ramas")
  ) {
    return {
      title: "Árbol caído o riesgo ambiental",
      emoji: "🌳",
      severity: "alta",
      category: "ambiental",
      agencyKey: "DAGMA",
      confidence: 85,
      recommendation: "Reporta al DAGMA y evita mover el árbol si hay cables o riesgo.",
    };
  }

  // PRIORIDAD 4: incendio
  if (
    text.includes("fire") ||
    text.includes("smoke") ||
    text.includes("flame") ||
    text.includes("incendio") ||
    text.includes("humo") ||
    text.includes("fuego")
  ) {
    return {
      title: "Incendio o emergencia activa",
      emoji: "🔥",
      severity: "alta",
      category: "emergencia",
      agencyKey: "BOMBEROS",
      confidence: 88,
      recommendation: "Aléjate del lugar y reporta de inmediato a Bomberos.",
    };
  }

  // PRIORIDAD 5: infraestructura
  if (
    text.includes("road") ||
    text.includes("street") ||
    text.includes("bridge") ||
    text.includes("hole") ||
    text.includes("crack") ||
    text.includes("sidewalk") ||
    text.includes("hueco") ||
    text.includes("grieta") ||
    text.includes("puente") ||
    text.includes("anden") ||
    text.includes("andén")
  ) {
    return {
      title: "Daño en infraestructura",
      emoji: "🏗️",
      severity: "media",
      category: "infraestructura",
      agencyKey: "INFRA",
      confidence: 80,
      recommendation: "Evita la zona si hay riesgo y reporta a Infraestructura.",
    };
  }

  return {
    title: "Caso por validar",
    emoji: "📍",
    severity: "media",
    category: "general",
    agencyKey: "INFRA",
    confidence: 55,
    recommendation: "No se pudo clasificar con seguridad. Revisión manual recomendada.",
  };
}

async function analyzeIncidentImage(buffer, userText = "") {
  const image = new Blob([buffer], { type: "image/jpeg" });

  let caption = "";
  let detections = [];

  try {
    const captionResult = await hf.imageToText({
      model: "nlpconnect/vit-gpt2-image-captioning",
      data: image,
    });

    caption =
      typeof captionResult === "string"
        ? captionResult
        : captionResult?.generated_text || "";
  } catch (err) {
    console.error("HF imageToText error:", err.message);
  }

  try {
    detections = await hf.objectDetection({
      model: "hustvl/yolos-tiny",
      data: image,
    });
  } catch (err) {
    console.error("HF objectDetection error:", err.message);
  }

  console.log("CAPTION HF:", caption);
  console.log("DETECTIONS HF:", detections);
  console.log("USER TEXT:", userText);

  return mapIncidentFromVision({ caption, detections, userText });
}//ia de imagenes

dotenv.config();

const hf = new InferenceClient(process.env.HF_TOKEN);  //ia de imagenes

const app = express();
const PORT = process.env.PORT || 3001;




app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://appfotos-8qot-oyxgtv3ad-julianiglesias24-9607s-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

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
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ninguna imagen." });
    }

      console.log("BODY TITLE:", req.body.title);
      console.log("BODY DESCRIPTION:", req.body.description);
      console.log("BODY PLACE:", req.body.place);

    const place = req.body.place || "";
    const title = req.body.title || "";
    const description = req.body.description || "";
    const userText = `${title} ${description}`.trim();

    const result = await analyzeIncidentImage(req.file.buffer, userText);

    return res.json({
      ...result,
      place,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Error IA real:", error);

    return res.status(500).json({
      error: "Error interno al analizar la imagen.",
      detail: error?.message || "Error desconocido",
    });
  }
});

app.listen(PORT, () => {
  console.log(`InfraCali backend activo en http://localhost:${PORT}`);
});
