const PROJECT_ID = 'pay-simple';
const URL_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const URL_CONTACTOS = `${URL_BASE}/contactos`;
const URL_RECIENTES = `${URL_BASE}/recientes`;

function mapearContacto(doc) {
  const id = doc.name.split('/').pop();
  return {
    id,
    name: doc.fields.nombre?.stringValue ?? '',
    alias: doc.fields.alias?.stringValue ?? '',
    cbu: doc.fields.cbu?.stringValue ?? '',
    banco: doc.fields.banco?.stringValue ?? '',
  };
}

// ---------- FAVORITOS (colección "contactos") ----------

export const obtenerFavoritos = async () => {
  const respuesta = await fetch(URL_CONTACTOS);
  if (!respuesta.ok)
    throw new Error(`Error al obtener favoritos: ${await respuesta.text()}`);
  const data = await respuesta.json();
  if (!data.documents) return [];
  return data.documents.map(mapearContacto);
};

export const agregarFavorito = async (contacto) => {
  const respuesta = await fetch(URL_CONTACTOS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        nombre: { stringValue: contacto.name },
        alias: { stringValue: contacto.alias },
        cbu: { stringValue: contacto.cbu },
        banco: { stringValue: contacto.banco },
      },
    }),
  });
  if (!respuesta.ok)
    throw new Error(`Error al agregar favorito: ${await respuesta.text()}`);
  return mapearContacto(await respuesta.json());
};

export const eliminarFavorito = async (id) => {
  const respuesta = await fetch(`${URL_CONTACTOS}/${id}`, { method: 'DELETE' });
  if (!respuesta.ok)
    throw new Error(`Error al eliminar favorito: ${await respuesta.text()}`);
};

// ---------- RECIENTES (colección "recientes", historial de transferencias) ----------

export const registrarTransferencia = async (contacto) => {
  const respuesta = await fetch(URL_RECIENTES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        nombre: { stringValue: contacto.name },
        alias: { stringValue: contacto.alias },
        cbu: { stringValue: contacto.cbu },
        banco: { stringValue: contacto.banco },
        fecha: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!respuesta.ok)
    throw new Error(
      `Error al registrar transferencia: ${await respuesta.text()}`
    );
  return await respuesta.json();
};

export const obtenerRecientes = async () => {
  const respuesta = await fetch(URL_RECIENTES);
  if (!respuesta.ok)
    throw new Error(`Error al obtener recientes: ${await respuesta.text()}`);
  const data = await respuesta.json();
  if (!data.documents) return [];

  const registros = data.documents.map((doc) => {
    const id = doc.name.split('/').pop();
    return {
      id,
      name: doc.fields.nombre?.stringValue ?? '',
      alias: doc.fields.alias?.stringValue ?? '',
      cbu: doc.fields.cbu?.stringValue ?? '',
      banco: doc.fields.banco?.stringValue ?? '',
      fecha: doc.fields.fecha?.timestampValue ?? null,
    };
  });

  // Un mismo contacto puede tener varios registros (varias transferencias).
  // Para la pantalla de "Recientes" nos interesa mostrar cada persona una
  // sola vez, con la fecha de la transferencia más nueva.
  registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const vistos = new Set();
  const unicos = [];
  for (const registro of registros) {
    if (!vistos.has(registro.cbu)) {
      vistos.add(registro.cbu);
      unicos.push(registro);
    }
  }
  return unicos;
};
