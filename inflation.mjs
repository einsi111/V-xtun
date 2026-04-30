export default async (req, context) => {
  const API_URL =
    'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';

  const query = {
    query: [
      {
        code: 'Liður',
        selection: {
          filter: 'item',
          values: ['6'], // 12 mánaða breyting %
        },
      },
    ],
    response: { format: 'json-stat2' },
  };

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Hagstofa HTTP ${resp.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600', // cache í 1 klst
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = { path: '/api/inflation' };
