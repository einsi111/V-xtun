export default async (req, context) => {
  const BASE_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';
  const url = new URL(req.url);

  // /api/inflation/meta — sýnir hvaða liðar eru til
  if (url.pathname.endsWith('/meta')) {
    try {
      const r = await fetch(BASE_URL);
      const d = await r.json();
      return new Response(JSON.stringify(d, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  // Sækja metadata fyrst til að fá réttar gildi
  try {
    const metaResp = await fetch(BASE_URL);
    if (!metaResp.ok) throw new Error(`Meta HTTP ${metaResp.status}`);
    const meta = await metaResp.json();

    // Finna Liður breytu
    const liðVar = meta.variables?.find(v => v.code === 'Liður');
    const tímiVar = meta.variables?.find(v => v.code === 'Tími');

    if (!liðVar || !tímiVar) {
      return new Response(JSON.stringify({ error: 'Fann ekki breytur', variables: meta.variables?.map(v => v.code) }), {
        status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Finna 12 mánaða breyting kóða
    let liðKóði = null;
    let liðHeiti = null;
    for (let i = 0; i < liðVar.values.length; i++) {
      const heiti = liðVar.valueTexts?.[i] || liðVar.values[i];
      if (/12.m[aá]n/i.test(heiti) || /12.month/i.test(heiti)) {
        liðKóði = liðVar.values[i];
        liðHeiti = heiti;
        break;
      }
    }
    // Fallback: síðasti liðurinn
    if (!liðKóði) {
      const last = liðVar.values.length - 1;
      liðKóði = liðVar.values[last];
      liðHeiti = liðVar.valueTexts?.[last] || liðKóði;
    }

    // Nýjasti tími
    const latestTími = tímiVar.values[tímiVar.values.length - 1];
    const latestTímiHeiti = tímiVar.valueTexts?.[tímiVar.values.length - 1] || latestTími;

    // Senda query með réttum kóðum
    const query = {
      query: [
        { code: 'Liður', selection: { filter: 'item', values: [liðKóði] } },
        { code: 'Tími', selection: { filter: 'item', values: [latestTími] } },
      ],
      response: { format: 'json-stat2' },
    };

    const dataResp = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!dataResp.ok) {
      const txt = await dataResp.text();
      return new Response(JSON.stringify({
        error: `Data HTTP ${dataResp.status}`,
        detail: txt,
        usedQuery: query,
        allLiðar: liðVar.values.map((v,i) => ({ kóði: v, heiti: liðVar.valueTexts?.[i] })),
      }), {
        status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await dataResp.json();
    const value = data.value?.[0];

    return new Response(JSON.stringify({
      value,
      time: latestTímiHeiti,
      liður: liðHeiti,
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
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = { path: '/api/inflation' };
