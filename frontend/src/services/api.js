const API_URL = import.meta.env.VITE_API_URL;

export async function getHealth() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("No se pudo consultar el backend.");
  }

  return response.json();
}

export async function analyzeImage(formData) {
  const response = await fetch(`${API_URL}/api/analyze-image`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Error al analizar la imagen.");
  }

  return data;
}

export async function getIncidents() {
  const response = await fetch(`${API_URL}/api/incidents`);

  if (!response.ok) {
    throw new Error("No se pudieron cargar los incidentes.");
  }

  return response.json();
}

export async function createIncident(payload) {
  const response = await fetch(`${API_URL}/api/incidents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "No se pudo crear el incidente.");
  }

  return data;
}