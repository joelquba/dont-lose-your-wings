export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Falta configurar SUPABASE_URL o SUPABASE_ANON_KEY a Vercel.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sessió no vàlida o no autenticada.' });
  }

  const token = authHeader.slice(7);

  // Verificar usuari autenticat amb Supabase Auth
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`
    }
  });

  if (!userResp.ok) {
    return res.status(401).json({ error: 'El token de sessió ha caducat o no és vàlid.' });
  }

  const user = await userResp.json();
  const restHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  try {
    if (req.method === 'GET') {
      const destino = (req.query?.destinacio || '').trim();
      let url = `${SUPABASE_URL}/rest/v1/viatges?select=*&order=data_inicial.asc`;
      if (destino) {
        url += `&destinacio=ilike.*${encodeURIComponent(destino)}*`;
      }

      const r = await fetch(url, { headers: restHeaders });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Error en obtenir els viatges.' });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { titol, destinacio, data_inicial, data_final } = req.body || {};
      const t = String(titol || '').trim();
      const d = String(destinacio || '').trim();

      if (!t || !d || !data_inicial || !data_final) {
        return res.status(400).json({ error: 'Cal omplir el títol, la destinació i les dues dates.' });
      }
      if (t.length > 150 || d.length > 150) {
        return res.status(400).json({ error: 'El títol i la destinació no poden superar els 150 caràcters.' });
      }
      if (data_final < data_inicial) {
        return res.status(400).json({ error: 'La data final no pot ser anterior a la data inicial.' });
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/viatges`, {
        method: 'POST',
        headers: restHeaders,
        body: JSON.stringify({
          usuari_id: user.id,
          titol: t,
          destinacio: d,
          data_inicial,
          data_final
        })
      });

      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'No s’ha pogut crear el viatge.' });
      return res.status(201).json(Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'PUT') {
      const { id, titol, destinacio, data_inicial, data_final } = req.body || {};
      const t = String(titol || '').trim();
      const d = String(destinacio || '').trim();

      if (!id || !t || !d || !data_inicial || !data_final) {
        return res.status(400).json({ error: 'Falten dades obligatòries per actualitzar el viatge.' });
      }
      if (data_final < data_inicial) {
        return res.status(400).json({ error: 'La data final no pot ser anterior a la data inicial.' });
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/viatges?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: restHeaders,
        body: JSON.stringify({
          titol: t,
          destinacio: d,
          data_inicial,
          data_final
        })
      });

      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'No s’ha pogut modificar el viatge.' });
      return res.status(200).json(Array.isArray(data) ? data[0] : data);
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id || req.body?.id;
      if (!id) {
        return res.status(400).json({ error: 'Cal indicar l’identificador del viatge a eliminar.' });
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/viatges?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: restHeaders
      });

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: errData.message || 'No s’ha pogut eliminar el viatge.' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Mètode no permès.' });
  } catch (err) {
    return res.status(500).json({ error: 'Error intern del servidor en processar la petició.' });
  }
}
