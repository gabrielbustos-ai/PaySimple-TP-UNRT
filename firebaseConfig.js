const PROJECT_ID = "pay-simple";

export const guardarContactoEnNube = async (contacto) => {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/contactos`;

  const respuesta = await fetch(url, {
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

  if (!respuesta.ok) {
    const errorTexto = await respuesta.text();
    throw new Error(`Error al guardar en Firestore: ${errorTexto}`);
  }

  return await respuesta.json();
};

export const obtenerContactos = async () => {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/contactos`;

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    const errorTexto = await respuesta.text();
    throw new Error(`Error al obtener contactos: ${errorTexto}`);
  }

  const data = await respuesta.json();

  // Si la colección está vacía, Firestore no devuelve "documents"
  if (!data.documents) return [];

  // Firestore devuelve cada documento con una estructura anidada (fields.campo.stringValue);
  // acá la "aplano" para que el resto de la app siga usando objetos simples como antes
  return data.documents.map((doc) => {
    const idPartes = doc.name.split('/');
    const id = idPartes[idPartes.length - 1];

    return {
      id,
      name: doc.fields.nombre?.stringValue ?? '',
      alias: doc.fields.alias?.stringValue ?? '',
      cbu: doc.fields.cbu?.stringValue ?? '',
      banco: doc.fields.banco?.stringValue ?? '',
    };
  });
};