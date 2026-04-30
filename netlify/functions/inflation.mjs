export default async (req, context) => {
  const META_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px?query';
  const DATA_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';

  try {
    // PxWeb metadata: GET með ?query
    const metaResp = await fetch(META_URL, {
      headers: { 'Accept': 'application/json' }
    });

    if (!metaResp.ok) {
      // Fallback: prófum án ?query
      const metaResp2 = await fetch(DATA_URL, {
        headers: { 'Accept': 'application/json' }
      });
      if (!metaResp2.ok) {
        return new Response(JSON.stringify({
          error: `Meta failed: ${metaResp.status} / ${metaResp2.status}`
        }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    const meta = await (metaResp.ok ? metaResp : await fetch(DATA_URL)).json();

    // Finna breytur
    const liðVar  = meta.variables?.find(v => v.code === 'Liður' || v.code === 'lidur');
    const tímiVar = meta.variables?.find(v => v.code === 'Tími'  || v.code === 'timi' || v.code === 'Timabil');

    if (!liðVar || !tímiVar) {
      return new Response(JSON.stringify({
        error: 'Breytur ekki fundnar',
        gotVariables: meta.variables?.map(v => ({ code: v.code, text: v.text })) ?? [],
        rawMeta: meta
      }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Finna 12 mánaða breyting
    let liðKóði = null, liðHeiti = null;
    for (let i = 0; i < liðVar.values.length; i++) {
      const h = liðVar.valueTexts?.[i] || liðVar.values[i];
      if (/12.m[aá]n/i.test(h) || /12.month/i.test(h) || /12 m/i.test(h)) {
        liðKóði = liðVar.values[i]; liðHeiti = h; break;
      }
    }
    if (!liðKóði) {
      // Skila lista af öllum liðum svo við sjáum hvað er til
      return new Response(JSON.stringify({
        error: '12 mánaða liður ekki fundinn',
        allLiðar: liðVar.values.map((v,i) => ({ kóði: v, heiti: liðVar.valueTexts?.[i] ?? v }))
      }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    // Nýjasti tími
    const n = tímiVar.values.length;
    const latestTími      = tímiVar.values[n - 1];
    const latestTímiHeiti = tímiVar.valueTexts?.[n - 1] || latestTími;

    // Query
    const query = {
      query: [
        { code: liðVar.code,  selection: { filter: 'item', values: [liðKóði] } },
        { code: tímiVar.code, selection: { filter: 'item', values: [latestTími] } },
      ],
      response: { format: 'json-stat2' },
    };

    const dataResp = await fetch(DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!dataResp.ok) {
      const txt = await dataResp.text();
      return new Response(JSON.stringify({
        error: `Data HTTP ${dataResp.status}`, detail: txt, query
      }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const data   = await dataResp.json();
    const value  = data.value?.[0];

    return new Response(JSON.stringify({ value, time: latestTímiHeiti, liður: liðHeiti }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: '/api/inflation' };
