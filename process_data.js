const fs = require('fs');
const path = require('path');

console.log('--- Iniciando processamento e correção de codificação geográfica ---');

// Carregar mapeamento oficial do IBGE para os 853 municípios de MG
const ibgeMap = JSON.parse(fs.readFileSync('d:/geoportal/ibge_mg_municipios.json', 'utf8'));
console.log(`Mapeamento oficial do IBGE carregado: ${Object.keys(ibgeMap).length} municípios.`);

// Correções específicas de gentílicos cadastrais
const adpatrioFixes = {
  '3148608': 'Peçanhense',
  '3131406': 'Ipiaçuense',
  '3117306': 'Conceição-Alagoense',
  '3119807': 'Córrego-Dantense',
  '3164308': 'São-Roquense',
  '3161106': 'São-Franciscano',
  '3151701': 'Poço-Fundense',
  '3162302': 'São-Joanense',
  '3127404': 'Gonçalvense',
  '3150901': 'Piranguçuense',
  '3164605': 'São-Sebastianense',
  '3117603': 'Conceição-Paraense',
  '3163102': 'São-Joseense',
  '3160801': 'São-Bentense',
  '3123601': 'Elói-Mendense',
  '3147204': 'Paraguaçuense',
  '3102902': 'Antônio-Carlense',
  '3162906': 'São-Joanense',
  '3101508': 'Além-Paraibano; Além-Paraibense',
  '3103108': 'Antônio-Pradense',
  '3122801': 'Dom-Viçosense',
  '3108701': 'Brás-Pirense',
  '3160900': 'Suaçuiense',
  '3161502': 'São-Geraldense',
  '3163805': 'São-Miguelense',
  '3171303': 'Viçosense',
  '3164803': 'São-Sebastianense',
  '3161700': 'São-Gonçalense',
  '3112703': 'Capitão-Eneense; Eneapolitano',
  '3162104': 'São-Gotardense',
  '3103207': 'Araçaiense',
  '3125408': 'Felício-Santense',
  '3136553': 'José-Raidense',
  '3100609': 'Água-Boense',
  '3168606': 'Teófilo-Otonense',
  '3100906': 'Águas-Formosense',
  '3162559': 'São-Joanense',
  '3100500': 'Açucenense',
  '3161601': 'São-Geraldense',
  '3158201': 'Suaçuiense',
  '3163300': 'São-Joseense',
  '3161650': 'São-Geraldense',
  '3120003': 'Córrego-Novense',
  '3103405': 'Araçuaiense',
  '3136520': 'José-Gonçalvense',
  '3100708': 'Água-Compridense',
  '3135001': 'Jaguaraçuense',
  '3139409': 'Manhuaçuense',
  '3113602': 'Careaçuense',
  '3145505': 'Olímpio-Noronhense; Olimpiano',
  '3163706': 'São-Lourenciano',
  '3161809': 'São-Gonçalense',
  '3127800': 'Grão-Mogolense',
  '3164209': 'São-Romanense',
  '3103009': 'Antônio-Diense',
  '3117702': 'Conceicionense',
  '3165008': 'São-Tiaguense; Santiaguense',
  '3119955': 'Córrego-Fundense',
  '3162500': 'São-Joanense',
  '3161908': 'São-Gonçalense; Rio-Abaixense',
  '3162922': 'São-Joaquinense',
  '3140159': 'Mário-Campista',
  '3147105': 'Pará-Minense',
  '3168309': 'Taquaraçuense',
  '3151800': 'Caldense; Poços-Caldense',
  '3101003': 'Vermelhense; Águas-Vermelhense',
  '3164100': 'São-Pedrense',
  '3133709': 'Itatiaiuçuense'
};

// Algoritmo Douglas-Peucker de simplificação vetorial
function getSqDist(p1, p2) {
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  return dx * dx + dy * dy;
}

function getSqSegDist(p, p1, p2) {
  let x = p1[0], y = p1[1];
  let dx = p2[0] - x, dy = p2[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

function simplifyDPStep(points, first, last, sqTolerance, simplified) {
  let maxSqDist = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (index !== -1) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

function simplifyDouglasPeucker(points, sqTolerance) {
  if (points.length <= 4) return points;
  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);
  if (simplified.length < 4) return points;
  return simplified;
}

function roundCoords(p) {
  return [Math.round(p[0] * 100000) / 100000, Math.round(p[1] * 100000) / 100000];
}

// 1. Processar Tombamentos IEPHA
console.log('1. Processando tombamentos IEPHA...');
const tombamentoPath = 'd:/geoportal/geojson/MG_TOMBAMENTO_IEPHA_2026_v1.geojson';
const tombamentoData = JSON.parse(fs.readFileSync(tombamentoPath, 'utf8'));

// Salvar data_tombamento.js
const tombamentoJs = 'window.DATA_TOMBAMENTO = ' + JSON.stringify(tombamentoData) + ';\n';
fs.writeFileSync('d:/geoportal/js/data_tombamento.js', tombamentoJs, 'utf8');
console.log(`Salvo data_tombamento.js com ${tombamentoData.features.length} bens tombados.`);

// 2. Processar e Reparar Municípios de MG
console.log('2. Lendo e corrigindo nomes dos municípios de MG...');
const muncPath = 'd:/geoportal/geojson/mg_munc.geojson';
const muncData = JSON.parse(fs.readFileSync(muncPath, 'utf8'));

let correctedNamesCount = 0;
let correctedOrigCount = 0;
let correctedAdpatrioCount = 0;

muncData.features.forEach(f => {
  const p = f.properties || {};
  const geocodigo = String(p.geocodigo || '').trim();

  // A) Corrigir NOME oficial usando base IBGE
  if (ibgeMap[geocodigo]) {
    const officialName = ibgeMap[geocodigo];
    if (p.nome !== officialName) {
      p.nome = officialName;
      correctedNamesCount++;
    }
  }

  // B) Corrigir Município de Origem 1
  const origCod1 = String(p.munorgc1 || '').trim();
  if (ibgeMap[origCod1]) {
    p.munorig1 = ibgeMap[origCod1];
    correctedOrigCount++;
  } else if (p.munorgc1 && (p.munorgc1.includes('\ufffd') || p.munorgc1.toLowerCase().includes('h'))) {
    p.munorgc1 = 'Não há';
    p.munorig1 = 'Não há';
  }

  // C) Corrigir Município de Origem 2
  const origCod2 = String(p.munorgc2 || '').trim();
  if (ibgeMap[origCod2]) {
    p.munorig2 = ibgeMap[origCod2];
  }

  // D) Corrigir Gentílico (adpatrio)
  if (adpatrioFixes[geocodigo]) {
    p.adpatrio = adpatrioFixes[geocodigo];
    correctedAdpatrioCount++;
  } else if (p.adpatrio && p.adpatrio.includes('\ufffd')) {
    // Limpar resíduos se houver
    p.adpatrio = p.adpatrio.replace(/\ufffd/g, '');
  }

  // E) Corrigir Lei de Criação
  if (p.leicriacao && typeof p.leicriacao === 'string') {
    p.leicriacao = p.leicriacao
      .replace(/Alvar\ufffd/g, 'Alvará')
      .replace(/Resolu\?\ufffdo/g, 'Resolução')
      .replace(/Resolu\ufffdo/g, 'Resolução')
      .replace(/n\ufffd/g, 'nº');
  }

  // F) Corrigir Denominação Anterior
  if (p.denomant && typeof p.denomant === 'string') {
    p.denomant = p.denomant
      .replace(/Santo Ant\ufffdnio/g, 'Santo Antônio')
      .replace(/S\ufffdo/g, 'São')
      .replace(/Boach\ufffd/g, 'Boachá')
      .replace(/Gl\ufffdria/g, 'Glória')
      .replace(/Guanh\ufffdes/g, 'Guanhães')
      .replace(/Pe\ufffdanha/g, 'Peçanha')
      .replace(/\ufffd/g, '');
  }
});

console.log(`Correções aplicadas:`);
console.log(`- Nomes oficiais de municípios corrigidos: ${correctedNamesCount}`);
console.log(`- Municípios de origem corrigidos: ${correctedOrigCount}`);
console.log(`- Gentílicos corrigidos: ${correctedAdpatrioCount}`);

// Simplificação geométrica para web
const tolerance = 0.0008; // ~80m
const sqTolerance = tolerance * tolerance;
let totalPoints = 0;

muncData.features.forEach(f => {
  if (!f.geometry) return;
  if (f.geometry.type === 'Polygon') {
    f.geometry.coordinates = f.geometry.coordinates.map(ring => {
      const simp = simplifyDouglasPeucker(ring, sqTolerance).map(roundCoords);
      totalPoints += simp.length;
      return simp;
    });
  } else if (f.geometry.type === 'MultiPolygon') {
    f.geometry.coordinates = f.geometry.coordinates.map(poly => {
      return poly.map(ring => {
        const simp = simplifyDouglasPeucker(ring, sqTolerance).map(roundCoords);
        totalPoints += simp.length;
        return simp;
      });
    });
  }
});

// Salvar versão otimizada com UTF-8 perfeito
const optGeojsonPath = 'd:/geoportal/geojson/mg_munc_web.geojson';
const optJsonStr = JSON.stringify(muncData);
fs.writeFileSync(optGeojsonPath, optJsonStr, 'utf8');
console.log(`Salvo: ${optGeojsonPath} (${(optJsonStr.length / 1024 / 1024).toFixed(2)} MB)`);

// Salvar data_munc.js com UTF-8 perfeito
const muncJsPath = 'd:/geoportal/js/data_munc.js';
fs.writeFileSync(muncJsPath, 'window.DATA_MUNIC = ' + optJsonStr + ';\n', 'utf8');
console.log(`Salvo: ${muncJsPath}`);

console.log('--- Processamento e correção concluídos com 100% de sucesso! ---');
