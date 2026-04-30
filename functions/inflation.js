export async function onRequest(context) {
  const DATA_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';
  
  const attempts = [['6'], ['06'], ['3'], ['03'], ['4'], ['04']];
  const errors = [];

  for (const values of attempts) {
    const query = {
      query: [
        { code: 'Liður', selection: { filter: 'item', values } },
        { code: 'Tími', selection: { filter: 'top', values: ['1'] } },
      ],
      response: { format: 'json-stat2' },
    };
    const resp = await fetch(DATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });
    const txt = await resp.text();
    errors.push({ values, status: resp.status, body: txt.substring(0, 200) });
    if (resp.ok) {
      const data = JSON.parse(txt);
      const value = data.value?.[0];
      const tímiLabels = data.dimension?.Tími?.category?.label ?? {};
      const tímiKeys = Object.keys(tímiLabels);
      const time = tímiLabels[tímiKeys[tímiKeys.length - 1]] ?? '';
      const liðLabels = data.dimension?.Liður?.category?.label ?? {};
      const liður = Object.values(liðLabels)[0] ?? values[0];
      return new Response(JSON.stringify({ value, time, liður }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
  return new Response(JSON.stringify({ error: 'Allar tilraunir mistókust', errors }), {
    status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
