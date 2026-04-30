export async function onRequest(context) {
  const DATA_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';

  const query = {
    query: [
      { code: 'Vísitala', selection: { filter: 'item', values: ['CPI'] } },
      { code: 'Liður',    selection: { filter: 'item', values: ['change_A'] } },
      { code: 'Mánuður',  selection: { filter: 'top',  values: ['1'] } },
    ],
    response: { format: 'json' },
  };

  try {
    const resp = await fetch(DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return new Response(JSON.stringify({ error: `HTTP ${resp.status}`, detail: txt }), {
        status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await resp.json();
    // json format: { columns: [...], data: [{ key: [...], values: [...] }] }
    const row = data.data?.[0];
    const value = parseFloat(row?.values?.[0]);
    const time = row?.key?.[0] ?? '';

    return new Response(JSON.stringify({ value, time, liður: '12 mánaða breyting' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
