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

  const restHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  function calcNits(inDate, outDate) {
    const d1 = new Date(`${inDate}T00:00:00Z`);
    const d2 = new Date(`${outDate}T00:00:00Z`);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  try {
    if (req.method === 'GET') {
      const viatgeId = req.query?.viatge_id;
      if (!viatgeId) return res.status(400).json({ error: 'Cal indicar viatge_id.' });

      const vResp = await fetch(`${SUPABASE_URL}/rest/v1/viatges?id=eq.${encodeURIComponent(viatgeId)}&select=*`, {
        headers: restHeaders
      });
      const vData = await vResp.json();
      if (!vResp.ok) return res.status(vResp.status).json({ error: vData.message || 'Error en carregar el viatge.' });
      const viatge = Array.isArray(vData) ? vData[0] : null;
      if (!viatge) return res.status(404).json({ error: 'No s’ha trobat el viatge o no tens permís per veure’l.' });

      const [aResp, lResp] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/allotjaments?viatge_id=eq.${encodeURIComponent(viatgeId)}&select=*&order=data_entrada.asc`, { headers: restHeaders }),
        fetch(`${SUPABASE_URL}/rest/v1/llocs_visitar?viatge_id=eq.${encodeURIComponent(viatgeId)}&select=*&order=id.asc`, { headers: restHeaders })
      ]);

      const allotjaments = aResp.ok ? await aResp.json() : [];
      const llocs = lResp.ok ? await lResp.json() : [];

      const totalAllotjament = allotjaments.reduce((acc, a) => acc + Number(a.preu || 0), 0);
      const totalNitsAllotjaments = allotjaments.reduce((acc, a) => acc + calcNits(a.data_entrada, a.data_sortida), 0);
      const nitsViatge = calcNits(viatge.data_inicial, viatge.data_final);

      const perCategoria = {};
      for (const l of llocs) {
        const cat = l.categoria || 'Altres';
        perCategoria[cat] = (perCategoria[cat] || 0) + 1;
      }

      return res.status(200).json({
        viatge,
        allotjaments,
        llocs,
        resum: {
          nits_viatge: nitsViatge,
          nits_allotjaments: totalNitsAllotjaments,
          cost_total_allotjament: Number(totalAllotjament.toFixed(2)),
          total_llocs: llocs.length,
          llocs_per_categoria: perCategoria
        }
      });
    }

    if (req.method === 'POST') {
      const { recurs, viatge_id } = req.body || {};
      if (!viatge_id) return res.status(400).json({ error: 'Falta viatge_id.' });

      const vResp = await fetch(`${SUPABASE_URL}/rest/v1/viatges?id=eq.${encodeURIComponent(viatge_id)}&select=*`, {
        headers: restHeaders
      });
      const vData = await vResp.json();
      const viatge = Array.isArray(vData) ? vData[0] : null;
      if (!viatge) return res.status(403).json({ error: 'No tens permís sobre aquest viatge.' });

      if (recurs === 'allotjament') {
        const nom = String(req.body.nom || '').trim();
        const adreca = String(req.body.adreca || '').trim();
        const data_entrada = req.body.data_entrada;
        const data_sortida = req.body.data_sortida;
        const preu = Number(req.body.preu);

        if (!nom || !adreca || !data_entrada || !data_sortida || Number.isNaN(preu)) {
          return res.status(400).json({ error: 'Cal omplir tots els camps de l’allotjament.' });
        }
        if (preu < 0) return res.status(400).json({ error: 'El preu no pot ser negatiu.' });
        if (data_sortida <= data_entrada) {
          return res.status(400).json({ error: 'La data de sortida ha de ser posterior a la d’entrada.' });
        }
        // Regla R-2: dates dins del període del viatge
        if (data_entrada < viatge.data_inicial || data_sortida > viatge.data_final) {
          return res.status(400).json({
            error: `Les dates de l’allotjament han d’estar dins del període del viatge (${viatge.data_inicial} a ${viatge.data_final}).`
          });
        }

        const r = await fetch(`${SUPABASE_URL}/rest/v1/allotjaments`, {
          method: 'POST',
          headers: restHeaders,
          body: JSON.stringify({ viatge_id, nom, adreca, data_entrada, data_sortida, preu })
        });
        const d = await r.json();
        if (!r.ok) return res.status(r.status).json({ error: d.message || 'Error en crear l’allotjament.' });
        return res.status(201).json(Array.isArray(d) ? d[0] : d);
      }

      if (recurs === 'lloc') {
        const nom_lloc = String(req.body.nom_lloc || '').trim();
        const categoria = String(req.body.categoria || 'Altres').trim();
        const notes = String(req.body.notes || '').trim();
        const categoriesValides = ['Cultura', 'Gastronomia', 'Natura', 'Oci', 'Altres'];

        if (!nom_lloc) return res.status(400).json({ error: 'Cal indicar el nom del lloc.' });
        if (!categoriesValides.includes(categoria)) {
          return res.status(400).json({ error: 'Categoria no vàlida.' });
        }

        const r = await fetch(`${SUPABASE_URL}/rest/v1/llocs_visitar`, {
          method: 'POST',
          headers: restHeaders,
          body: JSON.stringify({ viatge_id, nom_lloc, categoria, notes: notes || null })
        });
        const d = await r.json();
        if (!r.ok) return res.status(r.status).json({ error: d.message || 'Error en afegir el lloc.' });
        return res.status(201).json(Array.isArray(d) ? d[0] : d);
      }

      return res.status(400).json({ error: 'Tipus de recurs no vàlid.' });
    }

    if (req.method === 'DELETE') {
      const recurs = req.query?.recurs;
      const id = req.query?.id;
      if (!id || !['allotjament', 'lloc'].includes(recurs)) {
        return res.status(400).json({ error: 'Paràmetres d’eliminació incorrectes.' });
      }
      const taula = recurs === 'allotjament' ? 'allotjaments' : 'llocs_visitar';
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${taula}?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: restHeaders
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: d.message || 'No s’ha pogut eliminar el registre.' });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Mètode no permès.' });
  } catch (_err) {
    return res.status(500).json({ error: 'Error intern del servidor.' });
  }
}
