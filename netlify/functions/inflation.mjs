export default async (req, context) => {
  const API_URL =
    'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';

  // Biðjum um allt — sían er gerð á server-side
  const query = { query: [], response: { format: 'json-stat2' } };

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `Hagstofa HTTP ${resp.status}`, detail: txt }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();

    const liðurDim = data.dimension?.['Liður'];
    const tímiDim  = data.dimension?.['Tími'];

    if (!liðurDim || !tímiDim) {
      return new Response(JSON.stringify({ error: 'Óvænt gagnaskipulag', keys: Object.keys(data.dimension || {}) }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const liðLabels = liðurDim.category.label;
    const liðIndex  = liðurDim.category.index;

    // Leita að "12 mán" í liðaheitum
    let targetLiðKey = null;
    for (const [key, label] of Object.entries(liðLabels)) {
      if (/12.m[aá]n/i.test(label) || /12.month/i.test(label)) {
        targetLiðKey = key; break;
      }
    }
    // Fallback: síðasti liðurinn
    if (!targetLiðKey) targetLiðKey = Object.keys(liðLabels)[Object.keys(liðLabels).length - 1];

    const targetLiðPos = Array.isArray(liðIndex) ? liðIndex.indexOf(targetLiðKey) : liðIndex[targetLiðKey];

    // Nýjasti tími
    const tímiLabels = tímiDim.category.label;
    const tímiIndex  = tímiDim.category.index;
    const tímiKeys   = Object.keys(tímiLabels).sort((a,b) =>
      (Array.isArray(tímiIndex) ? tímiIndex.indexOf(a) : tímiIndex[a]) -
      (Array.isArray(tímiIndex) ? tímiIndex.indexOf(b) : tímiIndex[b])
    );
    const latestTímiKey = tímiKeys[tímiKeys.length - 1];
    const latestTímiPos = Array.isArray(tímiIndex) ? tímiIndex.indexOf(latestTímiKey) : tímiIndex[latestTímiKey];
    const latestTímiLabel = tímiLabels[latestTímiKey];

    // Flat index í values array
    const dimIds = data.id;
    const sizes  = data.size;
    const positions = dimIds.map(id => {
      if (id === 'Liður') return targetLiðPos;
      if (id === 'Tími')  return latestTímiPos;
      return 0;
    });
    let offset = 0, stride = 1;
    for (let i = dimIds.length - 1; i >= 0; i--) {
      offset += positions[i] * stride;
      stride *= sizes[i];
    }

    const value = data.value[offset];

    return new Response(JSON.stringify({
      value,
      time: latestTímiLabel,
      liður: liðLabels[targetLiðKey],
      allLiðar: liðLabels,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/inflation' };
