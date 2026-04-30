export async function onRequest(context) {
  const DATA_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';
  
  const attempts = [['6'], ['06'], ['3'], ['03'], ['4'], ['04']];

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
    if (resp.ok) {
      const data = await resp.json();
      const value = data.value?.[0];
      const tímiLabels = data.dimension?.Tími?.category?.label ?? {};
      const tímiKeys = Object.keys(tímiLabels);
      const time = tímiLabels[tímiKeys[tímiKeys.length - 1]] ?? '';
      const liðLabels = data.dimension?.Liður?.category?.label ?? {};
      const liður = Object.values(liðLabels)[0] ?? values[0];
      return new Response(JSON.stringify({ value, time, liður, usedValues: values }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' }
      });
    }
  }
  return new Response(JSON.stringify({ error: 'Villa við að sækja gögn' }), {
    status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
