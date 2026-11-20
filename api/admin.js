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
  const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userResp.ok) {
    return res.status(401).json({ error: 'El token de sessió ha caducat o no és vàlid.' });
  }

  const currentUser = await userResp.json();
  const restHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  // Regla R-6: comprovar que el perfil actual té rol 'admin'
  const profileResp = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(currentUser.id)}&select=id,rol`,
    { headers: restHeaders }
  );
  const profiles = profileResp.ok ? await profileResp.json() : [];
  const callerProfile = Array.isArray(profiles) ? profiles[0] : null;

  if (!callerProfile || callerProfile.rol !== 'admin') {
    return res.status(403).json({ error: 'Accés denegat: cal tenir rol d’administrador.' });
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,nom,email,rol,creat_el&order=creat_el.asc`, {
        headers: restHeaders
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.message || 'Error en obtenir els usuaris.' });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const targetId = req.query?.id || req.body?.id;
      if (!targetId) {
        return res.status(400).json({ error: 'Cal indicar l’identificador de l’usuari a eliminar.' });
      }
      if (targetId === currentUser.id) {
        return res.status(400).json({ error: 'No pots eliminar el teu propi compte d’administrador.' });
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers: restHeaders
      });

      if (!r.ok) {
        const errData = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: errData.message || 'No s’ha pogut eliminar l’usuari.' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Mètode no permès.' });
  } catch (_err) {
    return res.status(500).json({ error: 'Error intern del servidor.' });
  }
}
