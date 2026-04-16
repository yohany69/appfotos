import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { getHealth, getIncidents, createIncident } from "./services/api";

// Arreglar mapa (seleccionar icono)
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


const initialIncidents = [
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
    lng: -76.532,
    zone: "Centro",
    severity: "media",
    agency: "Secretaría de Movilidad",
    status: "En revisión",
  },
  {
    id: 3,
    title: "Cable energizado expuesto",
    emoji: "⚡",
    lat: 3.4409,
    lng: -76.4952,
    zone: "Oriente",
    severity: "alta",
    agency: "EMCALI",
    status: "Urgente",
  },
];

const agencies = {
  DAGMA: {
    name: "DAGMA",
    phone: "350 583 4595",
    purpose: "Árboles caídos y emergencias ambientales",
    help: "No intentes mover ramas grandes ni intervenir cables cercanos.",
  },
  BOMBEROS: {
    name: "Bomberos Cali",
    phone: "119",
    purpose: "Incendios, humo, fuego y rescate",
    help: "Aléjate del área y prioriza la vida antes que los objetos.",
  },
  EMCALI: {
    name: "EMCALI",
    phone: "Línea de atención",
    purpose: "Daños eléctricos, cables energizados y postes",
    help: "No toques cables ni zonas húmedas cercanas al daño.",
  },
  MOVILIDAD: {
    name: "Secretaría de Movilidad",
    phone: "127 opción 1",
    purpose: "Semáforos dañados y cruces peligrosos",
    help: "Cruza o conduce con máxima precaución.",
  },
  INFRA: {
    name: "Infraestructura",
    phone: "PQR Alcaldía",
    purpose: "Huecos, puentes y daños físicos en la vía",
    help: "No te acerques si hay riesgo de caída o colapso.",
  },
};

const rules = [
  {
    keywords: ["árbol", "arbol", "rama", "vegetación", "vegetacion", "caído", "caido"],
    category: "ambiental",
    agencyKey: "DAGMA",
    emoji: "🌳",
    title: "Árbol caído o riesgo ambiental",
    severity: "alta",
    recommendation: "Reporta al DAGMA. No muevas el árbol si compromete cables o personas.",
  },
  {
    keywords: ["incendio", "humo", "fuego", "llamas", "explosión", "explosion", "quemando"],
    category: "emergencia",
    agencyKey: "BOMBEROS",
    emoji: "🔥",
    title: "Incendio o emergencia activa",
    severity: "alta",
    recommendation: "Llama de inmediato a Bomberos y aléjate del lugar.",
  },
  {
    keywords: ["cable", "poste", "eléctrico", "electrico", "chispa", "energizado", "transformador"],
    category: "electrico",
    agencyKey: "EMCALI",
    emoji: "⚡",
    title: "Daño eléctrico",
    severity: "alta",
    recommendation: "Reporta a EMCALI. No toques cables ni permitas acercamiento.",
  },
  {
    keywords: ["semáforo", "semaforo", "cruce", "tránsito", "transito"],
    category: "movilidad",
    agencyKey: "MOVILIDAD",
    emoji: "🚦",
    title: "Falla en semáforo o cruce vial",
    severity: "media",
    recommendation: "Reporta a Movilidad y mantén precaución en el cruce.",
  },
  {
    keywords: ["hueco", "puente", "anden", "andén", "grieta", "vía", "via", "hundimiento"],
    category: "infraestructura",
    agencyKey: "INFRA",
    emoji: "🏗️",
    title: "Daño en infraestructura",
    severity: "media",
    recommendation: "Reporta a Infraestructura. Evita acercarte si ves riesgo estructural.",
  },
];

function classifyIncident(description) {
  const text = description.toLowerCase();
  let best = null;
  let score = 0;

  for (const rule of rules) {
    const hits = rule.keywords.filter((word) => text.includes(word)).length;
    if (hits > score) {
      score = hits;
      best = rule;
    }
  }

  if (!best) {
    return {
      title: "Caso por validar",
      emoji: "📍",
      severity: "media",
      category: "general",
      agencyKey: "INFRA",
      confidence: 35,
      recommendation: "No se pudo clasificar con seguridad. Describe mejor el problema.",
    };
  }

  return {
    ...best,
    confidence: Math.min(96, 55 + score * 18),
  };
}

function getColorBySeverity(severity) {
  if (severity === "alta") return "#ef4444";
  if (severity === "media") return "#f59e0b";
  return "#22c55e";
}

function getAgencyDisplayName(agencyKey) {
  if (agencyKey === "DAGMA") return "DAGMA";
  if (agencyKey === "BOMBEROS") return "Bomberos Cali";
  if (agencyKey === "EMCALI") return "EMCALI";
  if (agencyKey === "MOVILIDAD") return "Secretaría de Movilidad";
  return "Infraestructura";
}

function createEmojiIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size: 24px; line-height: 1;">${emoji}</div>`,
    className: "custom-emoji-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

function MapClickHandler({ onPickLocation }) {
  useMapEvents({
    click(e) {
      onPickLocation(e.latlng);
    },
  });
  return null;
}

// iconos en produccion leaflet *-
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
//   -*


function App() {
  useEffect(() => {
  async function loadIncidents() {
    try {
      const data = await getIncidents();
    //  console.log("Incidentes cargados:", data);
    const isDev = import.meta.env.DEV;

if (isDev) {
  console.log("Incidentes cargados:", data);
}
      setIncidents(data);
    } catch (error) {
      console.error("Error cargando incidentes:", error);
    }
  }

  loadIncidents();
}, []);
  const [incidents, setIncidents] = useState([]);
  // const [incidents, setIncidents] = useState(initialIncidents);
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("Cali - ubicación aproximada");
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageAiLoading, setImageAiLoading] = useState(false);
  const [imageAiResult, setImageAiResult] = useState(null);
  const [imageAiError, setImageAiError] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [selectedPoint, setSelectedPoint] = useState({ lat: 3.4516, lng: -76.532 });
  const [gpsStatus, setGpsStatus] = useState("GPS no usado todavía");
  const [filterType, setFilterType] = useState("todos");
  const [searchText, setSearchText] = useState("");

  const isMobile = window.innerWidth < 768;

  const vibratePress = (duration = 35) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
  }
};

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(
  window.matchMedia("(prefers-color-scheme: dark)").matches
);

  useEffect(() => {
  fetch("https://infracali-backend.onrender.com")
    .then((res) => res.json())
    .then((data) => {
     
      // console.log("Incidentes cargados:", data);
     const isDev = import.meta.env.DEV;

if (isDev) {
  console.log("Incidentes cargados:", data);
}


      setIncidents(data);
    })
    .catch((err) => console.error("Error cargando incidentes:", err));
}, []);

  const aiResult = useMemo(() => classifyIncident(description), [description]);
  const effectiveResult = imageAiResult || aiResult;
  const agencyInfo = agencies[effectiveResult.agencyKey] || agencies.INFRA;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      const matchesType =
        filterType === "todos" ||
        item.agency === filterType ||
        item.title.toLowerCase().includes(filterType.toLowerCase());

      const text = searchText.trim().toLowerCase();
      const matchesSearch =
        !text ||
        item.title.toLowerCase().includes(text) ||
        item.zone.toLowerCase().includes(text) ||
        item.agency.toLowerCase().includes(text);

      return matchesType && matchesSearch;
    });
  }, [incidents, filterType, searchText]);

    // console.log("Antes del fetch");
   const analyzeImageWithAI = async () => {
  //console.log("Se ejecutó analyzeImageWithAI");
    const isDev = import.meta.env.DEV;

if (isDev) {
  console.log("Se ejecutó analyzeImageWithAI");
}


  if (!imageFile) {
    //console.log("No hay imagen");
    const isDev = import.meta.env.DEV;

    if (isDev) {
      console.log("No hay imagen");
    }

    return;
  }

  try {
    setImageAiLoading(true);
    setImageAiError("");

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("title", reportTitle || "");
    formData.append("description", description || "");
    formData.append("place", place || "");

    //console.log("Enviando imagen al backend...");
    const isDev = import.meta.env.DEV;

if (isDev) {
  console.log("Enviando imagen al backend...");
}

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/analyze-image`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    //console.log("Respuesta del backend:", data);
    const isDev = import.meta.env.DEV;

if (isDev) {
  console.log("Respuesta del backend:", data);
}

    if (!response.ok) {
      throw new Error(data.error || "No se pudo analizar la imagen. Intenta nuevamente.");
    }

    // SOLO PARA PRUEBA (luego lo mejoramos)
    setImageAiResult({
      title: data.title || "Incidente detectado",
      emoji: data.emoji || "📍",
      category: data.category || "general",
      confidence: data.confidence || 70,
      agencyKey: data.agencyKey || "INFRA",
      recommendation: data.recommendation || "Revisión manual recomendada",
    });

  } catch (error) {
    console.error("Error IA:", error);
    setImageAiError(error.message);
  } finally {
    setImageAiLoading(false);
  }
};

useEffect(() => {
  if (!imageFile) return;

  const timer = setTimeout(() => {
    analyzeImageWithAI();
  }, 800);

  return () => clearTimeout(timer);
}, [imageFile]);

useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleThemeChange = (event) => {
    setIsDarkMode(event.matches);
  };

  mediaQuery.addEventListener("change", handleThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleThemeChange);
  };
}, []);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus("Tu navegador no permite geolocalización");
      return;
    }

    setGpsStatus("Obteniendo ubicación actual...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedPoint(point);
        setPlace(`Mi ubicación actual (${point.lat.toFixed(5)}, ${point.lng.toFixed(5)})`);
        setGpsStatus("Ubicación obtenida correctamente");
      },
      (error) => {
        if (error.code === 1) {
          setGpsStatus("Permiso de ubicación denegado");
        } else if (error.code === 2) {
          setGpsStatus("No se pudo determinar la ubicación");
        } else if (error.code === 3) {
          setGpsStatus("La solicitud de ubicación tardó demasiado");
        } else {
          setGpsStatus("Error al obtener ubicación");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

const submitReport = async () => {
  try {
    const result = imageAiResult || effectiveResult;

    const payload = {
      title: reportTitle || result.title,
      emoji: result.emoji,
      lat: selectedPoint.lat,
      lng: selectedPoint.lng,
      zone: place,
      severity: result.severity || "media",
      agency: agencies[result.agencyKey]?.name || "Infraestructura",
      status: "Nuevo",
    };

    const createdIncident = await createIncident(payload);

    setIncidents((prev) => [createdIncident, ...prev]);

    setReportTitle("");
    setDescription("");
    setPlace("Cali - ubicación aproximada");
    setPreview(null);
    setImageFile(null);
    setImageAiError("");
  } catch (error) {
    console.error("Error publicando incidente:", error);
    alert("No se pudo publicar el incidente.");
  }
};

  const theme = {
  background: isDarkMode ? "#0f172a" : "#f8fafc",
  card: isDarkMode ? "#1e293b" : "#ffffff",
  cardSoft: isDarkMode ? "#334155" : "#f8fafc",
  text: isDarkMode ? "#f8fafc" : "#0f172a",
  textSoft: isDarkMode ? "#cbd5e1" : "#475569",
  border: isDarkMode ? "#334155" : "#e2e8f0",
  primary: "#0ea5e9",
};

  return (
    <div
  style={{
    minHeight: "100vh",
    background: theme.background,
    padding: isMobile ? "12px" : "24px",
    fontFamily: "Arial, sans-serif",
    color: theme.text,
  }}
>
<div
  style={{
    maxWidth: "1200px",
    margin: "0 auto",
    paddingBottom: isMobile ? "90px" : "0px",
  }}
>        <div
          style={{
    background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
    padding: isMobile ? "18px 16px" : "24px 20px",
    borderRadius: "28px",
    marginBottom: "20px",
    boxShadow: "0 10px 30px rgba(2, 132, 199, 0.10)",
    border: "1px solid #e0f2fe",
  }}
>
  <div
    style={{
      display: "inline-block",
      background: "#e0f2fe",
      color: "#075985",
      padding: "8px 14px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "bold",
      marginBottom: "14px",
    }}
  >
    Cali inteligente y segura
  </div>

  <h1
  style={{
    fontSize: isMobile ? "28px" : "36px",
    lineHeight: 1.1,
    margin: "0 0 12px 0",
    color: "#0f172a",
  }}
>
    InfraCali IA
  </h1>

  <p
    style={{
      color: theme.textSoft,
      fontSize: "16px",
      lineHeight: 1.5,
      marginBottom: "18px",
      maxWidth: "700px",
    }}
  >
    Reporta incidentes de infraestructura en Cali, visualízalos en el mapa y recibe
    recomendaciones automáticas sobre qué hacer y a quién acudir.
  </p>

  <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: "12px",
  }}
>
    <button
      onClick={() => {

        vibratePress();

        const mapSection = document.getElementById("mapa-section");
        mapSection?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        padding: "14px 16px",
        borderRadius: "16px",
        border: "none",
        background: "#0ea5e9",
        color: "white",
        fontWeight: "bold",
        fontSize: "15px",
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(14,165,233,0.25)",
      }}
    >
      Ver mapa
    </button>

    <button
      onClick={() => {

        vibratePress();

        const reportSection = document.getElementById("reportar-section");
        reportSection?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        padding: "14px 16px",
        borderRadius: "16px",
        border: "1px solid #bae6fd",
        background: theme.card,
        color: "#0369a1",
        fontWeight: "bold",
        fontSize: "15px",
        cursor: "pointer",
      }}
    >
      Reportar ahora
    </button>
    {loading && (
  <div style={{
    marginTop: "10px",
    padding: "10px",
    borderRadius: "10px",
    background: "#eef2ff",
    color: "#3730a3",
    fontSize: "14px"
  }}>
    Analizando imagen...
  </div>
)}

{error && (
  <div style={{
    marginTop: "10px",
    padding: "10px",
    borderRadius: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "14px"
  }}>
    {error}
  </div>
)}

{success && (
  <div style={{
    marginTop: "10px",
    padding: "10px",
    borderRadius: "10px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "14px"
  }}>
    {success}
  </div>
)}
  </div>
</div>

        <div
          style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr",
    gap: "20px",
  }}
>
          <div
            id="mapa-section"
            style={{
              background: theme.card,
              padding: "20px",
              borderRadius: "24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Mapa real de Cali</h2>
            <p style={{ color: "#64748b", marginBottom: "12px" }}>
              Haz clic en el mapa para escoger la ubicación exacta del reporte.
            </p>

            <div
              style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  }}
>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ width: "100%", padding: isMobile ? "14px" : "12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
              >
                <option value="todos">Todos los incidentes</option>
                <option value="DAGMA">Ambiental / Árboles</option>
                <option value="Secretaría de Movilidad">Semáforos / Movilidad</option>
                <option value="EMCALI">Eléctrico</option>
                <option value="Infraestructura">Infraestructura vial</option>
                <option value="Bomberos Cali">Incendio / Emergencia</option>
              </select>

              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar por barrio o dirección"
                style={{ width: "100%", padding: isMobile ? "14px" : "12px", borderRadius: "12px", border: "1px solid #cbd5e1" }}
              />
            </div>

            <div style={{ borderRadius: "24px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <MapContainer
  center={[3.4516, -76.532]}
  zoom={12}
  style={{ height: isMobile ? "320px" : "460px", width: "100%" }}
>
                  {incidents.map((incident) => (
                 <CircleMarker
                    key={incident.id}
                    center={[incident.lat, incident.lng]}
    radius={12}
    pathOptions={{ color: "red" }}
  >
    <Popup>
      <strong>{incident.emoji} {incident.title}</strong><br />
      Zona: {incident.zone}<br />
      Entidad: {incident.agency}<br />
      Estado: {incident.status}
    </Popup>
  </CircleMarker>
))}
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onPickLocation={(latlng) => setSelectedPoint(latlng)} />

                {filteredIncidents.map((item) => (
                  <React.Fragment key={item.id}>
                    <CircleMarker
                      center={[item.lat, item.lng]}
                      radius={18}
                      pathOptions={{
                        color: getColorBySeverity(item.severity),
                        fillColor: getColorBySeverity(item.severity),
                        fillOpacity: 0.25,
                      }}
                    />
                    <Marker position={[item.lat, item.lng]} icon={createEmojiIcon(item.emoji)}>
                      <Popup>
                        <div>
                          <strong>{item.title}</strong>
                          <br />
                          Zona: {item.zone}
                          <br />
                          Entidad: {item.agency}
                          <br />
                          Estado: {item.status}
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                ))}

                <Marker position={[selectedPoint.lat, selectedPoint.lng]}>
                  <Popup>Ubicación seleccionada para el nuevo reporte</Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>

          <div
            id="reportar-section"

            style={{
              background: theme.card,
              padding: "20px",
              borderRadius: "24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Reportar incidente</h2>

            <div style={{ marginTop: "16px" }}>
              <input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Título del reporte"
                style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #cbd5e1", marginBottom: "10px" }}
              />

              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="Ubicación aproximada"
                style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #cbd5e1", marginBottom: "10px" }}
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe lo que sucede"
                rows={5}
                style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "1px solid #cbd5e1", marginBottom: "10px" }}
              />

              <label
                style={{
                  display: "block",
                  border: "2px dashed #cbd5e1",
                  borderRadius: "18px",
                  padding: "20px",
                  textAlign: "center",
                  background: "#f8fafc",
                  cursor: "pointer",
                  marginBottom: "14px",
                }}
              >
                Subir foto del incidente
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setPreview(URL.createObjectURL(file));
                      setImageAiResult(null);
                      setImageAiError("");
                    }
                  }}
                />
              </label>

              {preview && (
                <>
                  <img
                    src={preview}
                    alt="Vista previa"
                    style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "18px", marginBottom: "12px" }}
                  />

                  <button
                    onClick={analyzeImageWithAI}
                    disabled={imageAiLoading}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "14px",
                      border: "1px solid #7c3aed",
                      background: imageAiLoading ? "#ede9fe" : "#faf5ff",
                      color: "#6d28d9",
                      fontWeight: "bold",
                      cursor: imageAiLoading ? "not-allowed" : "pointer",
                      marginBottom: "12px",
                    }}
                  >
                    {imageAiLoading ? "Analizando imagen con IA..." : "Analizar imagen con IA"}
                  </button>

                  {imageAiError && (
                    <div
                      style={{
                        marginBottom: "12px",
                        padding: "12px",
                        borderRadius: "12px",
                        background: "#fef2f2",
                        color: "#991b1b",
                        fontSize: "14px",
                        border: "1px solid #fecaca",
                      }}
                    >
                      {imageAiError}
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "grid", gap: "10px", marginBottom: "12px" }}>
                <button
                  onClick={useCurrentLocation}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "14px",
                    border: "1px solid #0ea5e9",
                    background: "#f0f9ff",
                    color: "#0369a1",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Usar ubicación automática con GPS
                </button>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    color: theme.textSoft,
                    fontSize: "14px",
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  Estado GPS: {gpsStatus}
                </div>

                <div
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#eff6ff",
                    color: "#1e3a8a",
                    fontSize: "14px",
                  }}
                >
                  Punto seleccionado: {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
                </div>
              </div>

              <button
                onClick={submitReport}
                style={{
                  width: "100%",
                  padding: isMobile ? "14px" : "12px",
                  borderRadius: "14px",
                  border: "none",
                  background: "#0ea5e9",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Publicar en el mapa
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: "20px",
    marginTop: "20px",
  }}
>
          <div
            style={{
              background: theme.card,
              padding: "20px",
              borderRadius: "24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Recomendación automática</h2>

            <div style={{ marginTop: "14px", padding: "16px", border: `1px solid ${theme.border}`, borderRadius: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ fontSize: "38px" }}>{effectiveResult.emoji}</div>
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    background: imageAiResult ? "#f3e8ff" : "#e0f2fe",
                    color: imageAiResult ? "#7e22ce" : "#075985",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {imageAiResult ? "Análisis por IA de imagen" : "Análisis por descripción"}
                </div>
              </div>

              <h3>{effectiveResult.title}</h3>
              <p style={{ color: "#64748b" }}>Categoría: {effectiveResult.category}</p>
              <p style={{ marginTop: "10px" }}>
                <strong>Confianza:</strong> {effectiveResult.confidence}%
              </p>
              <p>
                <strong>Entidad sugerida:</strong> {agencyInfo.name}
              </p>
              <p style={{ marginTop: "10px", color: "#334155" }}>{effectiveResult.recommendation}</p>
            </div>

            <div style={{ marginTop: "14px", padding: "16px", border: "1px solid #e2e8f0", borderRadius: "18px" }}>
              <p style={{ fontWeight: "bold" }}>Contacto recomendado</p>
              <p>{agencyInfo.name}</p>
              <p style={{ color: "#64748b" }}>{agencyInfo.phone}</p>
              <p style={{ marginTop: "8px", fontSize: "14px", color: theme.textSoft }}>{agencyInfo.purpose}</p>
            </div>

            <div style={{ marginTop: "14px", padding: "16px", borderRadius: "18px", background: "#fef3c7" }}>
              <p style={{ fontWeight: "bold" }}>¿Ayudar o no ayudar?</p>
              <p>{agencyInfo.help}</p>
            </div>
          </div>

          <div
            style={{
              background: theme.card,
              padding: "20px",
              borderRadius: "24px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Cómo instalar el mapa real</h2>
            <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>1. Instala dependencias</p>
                <p>npm install react-leaflet leaflet</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>2. Mantén este import</p>
                <p>import "leaflet/dist/leaflet.css";</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>3. Ejecuta el proyecto</p>
                <p>npm run dev</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>4. Uso</p>
                <p>Haz clic en el mapa para seleccionar la ubicación exacta del incidente.</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>5. GPS del celular</p>
                <p>Usa el botón de ubicación automática para tomar las coordenadas reales del dispositivo.</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>6. Filtros y búsqueda</p>
                <p>Filtra incidentes por tipo y busca por barrio, zona o dirección aproximada.</p>
              </div>
              <div style={{ padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                <p style={{ fontWeight: "bold" }}>7. IA real de imágenes</p>
                <p>Sube una foto y usa el botón “Analizar imagen con IA” para obtener una recomendación automática real desde el backend.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isMobile && (
  <div
    style={{
      position: "fixed",
      bottom: "0",
      left: "0",
      width: "100%",
      background: theme.card,
      borderTop: `1px solid ${theme.border}`,
      display: "flex",
      justifyContent: "space-around",
      alignItems: "center",
      padding: "10px 0",
      zIndex: 999,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
    }}
  >
    <button
      onClick={() => {
        vibratePress();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: "12px",
        color: theme.primary,
        fontWeight: "bold",
      }}
    >
      🏠
      Inicio
    </button>

    <button
      onClick={() => {
        vibratePress();
        const mapSection = document.getElementById("mapa-section");
        mapSection?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: "12px",
        color: theme.textSoft,
      }}
    >
      🗺️
      Mapa
    </button>

    <button
      onClick={() => {
        vibratePress(50);
        const reportSection = document.getElementById("reportar-section");
        reportSection?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        background: theme.primary,
        border: "none",
        borderRadius: "50%",
        width: "60px",
        height: "60px",
        color: "white",
        fontSize: "26px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginTop: "-30px",
        boxShadow: "0 10px 25px rgba(14,165,233,0.35)",
        cursor: "pointer",
      }}
    >
      📸
    </button>

    <button
      onClick={() => {
        vibratePress();
        const reportSection = document.getElementById("reportar-section");
        reportSection?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: "12px",
        color: theme.textSoft,
      }}
    >
      ⚠️
      Reportar
    </button>

    <button
      onClick={() => {
        vibratePress();
        alert("Función de ayuda próximamente");
      }}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: "12px",
        color: theme.textSoft,
      }}
    >
      ℹ️
      Ayuda
    </button>
  </div>
)}
    </div>
  );
}

export default App;



