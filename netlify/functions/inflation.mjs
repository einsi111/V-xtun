export default async (req, context) => {
  const DATA_URL = 'https://px.hagstofa.is/pxis/api/v1/is/Efnahagur/Efnahagur__visitolur__1_vnv__1_vnv/VIS01000.px';

  // Reynum nokkur mismunandi snið fyrir Liður kóðana
  // Við vitum að liðirnir eru: Vísitala, 1 mán breyting, 12 mán breyting o.s.frv.
  // Prófum kóðana: "6", "06", "3", "03" og filter=top á Tími
  const attempts = [
    // filter=top gefur nýjasta tíma — þetta er staðlað í PxWeb
    { code: 'Liður', values: ['6'],  tímiFilter: 'top', tímiValues: ['1'] },
    { code: 'Liður', values: ['06'], tímiFilter: 'top', tímiValues: ['1'] },
    { code: 'Liður', values: ['3'],  tímiFilter: 'top', tímiValues: ['1'] },
    { code: 'Liður', values: ['03'], tímiFilter: 'top', tímiValues: ['1'] },
    { code: 'Liður', values: ['4'],  tímiFilter: 'top', tímiValues: ['1'] },
    { code: 'Liður', values: ['04'], tímiFilter: 'top', tímiValues: ['1'] },
  ];

  const errors = [];

  for (const a of attempts) {
    const query = {
      query: [
        { code: a.code, selection: { filter: 'item', values: a.values } },
        { code: 'Tími', selection: { filter: a.tímiFilter, values: a.tímiValues } },
      ],
      response: { format: 'json-stat2' },
    };

    try {
      const resp = await fetch(DATA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });

      if (resp.ok) {
        const data = await resp.json();
        const value = data.value?.[0];
        // Finna tímaheiti
        const tímiDim = data.dimension?.Tími;
        const tímiLabels = tímiDim?.category?.label ?? {};
        const tímiKeys = Object.keys(tímiLabels);
        const timeLabel = tímiLabels[tímiKeys[tímiKeys.length - 1]] ?? '';

        // Finna liðaheiti
        const liðDim = data.dimension?.Liður;
        const liðLabels = liðDim?.category?.label ?? {};
        const liðKeys = Object.keys(liðLabels);
        const liðLabel = liðLabels[liðKeys[0]] ?? a.values[0];

        return new Response(JSON.stringify({
          value,
          time: timeLabel,
          liður: liðLabel,
          usedValues: a.values,
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } else {
        const txt = await resp.text();
        errors.push({ values: a.values, status: resp.status, body: txt.substring(0, 100) });
      }
    } catch (e) {
      errors.push({ values: a.values, error: e.message });
    }
  }

  return new Response(JSON.stringify({ error: 'Allar tilraunir mistókust', errors }), {
    status: 502,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
};

export const config = { path: '/api/inflation' };
