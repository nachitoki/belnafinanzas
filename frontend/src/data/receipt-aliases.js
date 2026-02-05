export const RECEIPT_ALIASES = [
    {
        match: ['miel de abeja aysen 500'],
        clean: 'Miel de abeja 500 g',
        brand: 'Aysen'
    },
    {
        match: ['pilas duracell triple a'],
        clean: 'Pilas AAA',
        brand: 'Duracell'
    },
    {
        match: ['palta cod'],
        clean: 'Palta (kg)',
        brand: null
    },
    {
        match: ['clementina malla 1'],
        clean: 'Clementina malla 1 kg',
        brand: null
    },
    {
        match: ['pizza cong sadia'],
        clean: 'Pizza congelada',
        brand: 'Sadia'
    },
    {
        match: ['pizza artesanal'],
        clean: 'Pizza artesanal',
        brand: 'PF'
    },
    {
        match: ['ramitas s original'],
        clean: 'Ramitas originales (S)',
        brand: 'Evercrisp'
    },
    {
        match: ['detodoito ii', 'detodoito 2', 'detodito ii', 'detodito li', 'detodito ii evercr', 'detodito li evercr'],
        clean: 'De Todito 2',
        brand: 'Evercrisp'
    },
    {
        match: ['crunchis mani marc'],
        clean: 'Crunchis mani',
        brand: 'Marco Polo'
    },
    {
        match: ['coca cola lata 350'],
        clean: 'Coca-Cola lata 350 ml',
        brand: 'Coca-Cola'
    },
    {
        match: ['naranja sofruco'],
        clean: 'Naranja malla',
        brand: 'Sofruco'
    },
    {
        match: ['aco ballerina dp 7', 'aco ballerina dp7'],
        clean: 'Acondicionador DP7',
        brand: 'Ballerina'
    },
    {
        match: ['manzana verde expo'],
        clean: 'Manzana verde (kg)',
        brand: null
    },
    {
        match: ['molde queque red'],
        clean: 'Molde queque',
        brand: 'RED'
    },
    {
        match: ['harina integral se lecta', 'harina integral selecta'],
        clean: 'Harina integral 1 kg',
        brand: 'Selecta'
    },
    {
        match: ['chancaca 2 bloques'],
        clean: 'Chancaca pack 2',
        brand: null
    },
    {
        match: ['bolsas basura cocina', 'bolsas de basura cocina'],
        clean: 'Bolsas basura cocina',
        brand: null
    },
    {
        match: ['bolsas basura mascotas'],
        clean: 'Bolsas basura mascotas',
        brand: null
    },
    {
        match: ['carne entera'],
        clean: 'Carne entera (trozo)',
        brand: null
    },
    {
        match: ['bistec'],
        clean: 'Bistec (corte)',
        brand: null
    },
    {
        match: ['set escritorio art'],
        clean: 'Set escritorio (articulos)',
        brand: null
    },
    {
        match: ['saborizante frutilla'],
        clean: 'Saborizante frutilla',
        brand: null
    },
    {
        match: ['saborizante chocolate', 'saborizantechocolate'],
        clean: 'Saborizante chocolate',
        brand: null
    },
    {
        match: ['oliva', 'aceite de oliva'],
        clean: 'Aceite de oliva',
        brand: null
    }
];

export const RECEIPT_FALLBACKS = [
    {
        match: ['pilas aaa', 'pilas triple a', 'triple a pilas'],
        clean: 'Pilas AAA',
        brand: null
    },
    {
        match: ['pilas aa', 'pilas doble a', 'doble a pilas'],
        clean: 'Pilas AA',
        brand: null
    }
];
