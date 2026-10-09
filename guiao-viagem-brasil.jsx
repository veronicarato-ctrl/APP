import { useState, useEffect, useMemo } from "react";

/* ============ DADOS INICIAIS (nada reservado) ============ */
const KEY = "viagem:brasil-2026";

const PLACES = {
  for: { n: "Fortaleza, aeroporto Pinto Martins", lat: -3.7788, lng: -38.5406, r: "ce" },
  mbr: { n: "Morro Branco", lat: -4.164, lng: -38.125, r: "ce", ap: 1 },
  can: { n: "Canoa Quebrada", lat: -4.527, lng: -37.691, r: "ce", ap: 1 },
  jer: { n: "Jericoacoara", lat: -2.7974, lng: -40.5124, r: "ce" },
  mao: { n: "Manaus, Teatro Amazonas", lat: -3.1303, lng: -60.0234, r: "am" },
  enc: { n: "Encontro das Águas", lat: -3.1367, lng: -59.9047, r: "am" },
  tum: { n: "Tumbira, baixo Rio Negro", lat: -3.05, lng: -60.5, r: "am", ap: 1 },
  ana: { n: "Anavilhanas", lat: -2.55, lng: -60.85, r: "am", ap: 1 },
  sjl: { n: "São Gabriel da Cachoeira", lat: -0.13, lng: -67.09, r: "am", ap: 1 },
};

const B = (id, k, t, x = {}) => ({ id, k, t, status: "todo", ref: "", tel: "", addr: "", ci: "", co: "", note: "", ...x });
const BOOKINGS = [
  B("f1", "voo", "Genebra para Fortaleza", { date: "2026-12-14", note: "Via Lisboa (sugestão TAP, por confirmar)." }),
  B("h1", "hotel", "Hotel em Fortaleza, a escolher", { from: "2026-12-14", to: "2026-12-15", p: "for" }),
  B("t1", "transfer", "Fortaleza para Canoa Quebrada", { date: "2026-12-15", note: "Cerca de 160 km, duas a três horas." }),
  B("h2", "hotel", "Pousada em Canoa Quebrada, a escolher", { from: "2026-12-15", to: "2026-12-17", p: "can" }),
  B("t2", "transfer", "Canoa Quebrada para Jericoacoara", { date: "2026-12-17", note: "Atravessa Fortaleza, duração a confirmar." }),
  B("h3", "hotel", "Pousada em Jericoacoara, a escolher", { from: "2026-12-17", to: "2026-12-20", p: "jer" }),
  B("f2", "voo", "Jericoacoara para Fortaleza", { date: "2026-12-20" }),
  B("f3", "voo", "Fortaleza para Manaus", { date: "2026-12-20", note: "Directo, cerca de 3h25. Margem confortável após o voo de Jeri." }),
  B("h4", "hotel", "Hotel em Manaus, a escolher", { from: "2026-12-20", to: "2026-12-21", p: "mao" }),
  B("p3", "contacto", "Poranduba Amazônia, roteiro do baixo Rio Negro", { status: "urgent", note: "Operadora de base comunitária fundada no Tumbira." }),
  B("h5", "hotel", "Pousada comunitária, baixo Rio Negro", { from: "2026-12-21", to: "2026-12-23", p: "tum" }),
  B("f4", "voo", "Manaus para São Gabriel da Cachoeira", { date: "2026-12-23", status: "urgent", note: "Azul, cerca de 1h35, só duas a três frequências por semana." }),
  B("h6", "hotel", "Alojamento em São Gabriel da Cachoeira", { from: "2026-12-23", to: "2026-12-25", p: "sjl" }),
  B("p1", "autorização", "Autorização FUNAI, aldeias do alto Rio Negro", { status: "urgent", note: "Pede-se com bastante antecedência, mediada pela FOIRN." }),
  B("p2", "contacto", "FOIRN, São Gabriel da Cachoeira", { status: "urgent" }),
  B("f5", "voo", "São Gabriel da Cachoeira para Manaus", { date: "2026-12-25", status: "urgent" }),
  B("h7", "hotel", "Hotel em Manaus, a escolher", { from: "2026-12-25", to: "2026-12-26", p: "mao" }),
  B("f6", "voo", "Manaus para Genebra", { date: "2026-12-26", note: "Via Lisboa (sugestão, por confirmar)." }),
  B("p4", "contacto", "Via ritual, tradição reconhecida (opcional)", { note: "Santo Daime, União do Vegetal ou comunidade anfitriã. Triagem prévia da medicação obrigatória." }),
];

let n = 0;
const S = (ty, t, d = "", o = {}) => ({ id: "s" + ++n, ty, t, d, st: "", en: "", p: "", b: "", h: 0, who: "", ...o });
const DAYS = {
  "2026-12-14": { note: "Dia de chegada, programa mínimo.", slots: [
    S("x", "Chegada a Fortaleza", "Horário do voo por definir", { p: "for", b: "f1", h: 1 }),
    S("l", "Check-in em Fortaleza", "Malas depositadas logo à chegada", { p: "for", b: "h1" }),
    S("f", "Jantar leve perto do hotel", "", { p: "for" }) ] },
  "2026-12-15": { note: "", slots: [
    S("l", "Check-out em Fortaleza", "", { st: "08:30", p: "for", b: "h1" }),
    S("x", "Transfer para Canoa Quebrada", "Paragem nas areias coloridas de Morro Branco", { st: "09:00", en: "13:00", p: "mbr", b: "t1", h: 1 }),
    S("l", "Check-in em Canoa Quebrada", "", { st: "13:00", p: "can", b: "h2" }),
    S("f", "Jantar na Broadway", "Rua principal da antiga vila de pescadores", { st: "19:30", p: "can" }) ] },
  "2026-12-16": { note: "", slots: [
    S("n", "Buggy pelas falésias e lagoa do Oásis", "Falésias avermelhadas, símbolo da lua e estrela", { st: "09:00", en: "13:00", p: "can", h: 1 }),
    S("w", "Descanso", "", { st: "13:30", en: "16:00", p: "can" }),
    S("n", "Pôr do sol nas falésias", "", { st: "17:00", en: "18:00", p: "can" }) ] },
  "2026-12-17": { note: "Canoa e Jeri ficam em lados opostos de Fortaleza, dia de estrada.", slots: [
    S("l", "Check-out em Canoa Quebrada", "", { st: "07:30", p: "can", b: "h2" }),
    S("x", "Transfer para Jericoacoara", "Duração por confirmar", { st: "08:00", p: "jer", b: "t2", h: 1 }),
    S("l", "Check-in em Jericoacoara", "", { p: "jer", b: "h3" }),
    S("n", "Pôr do sol na Duna", "", { p: "jer" }) ] },
  "2026-12-18": { note: "", slots: [
    S("n", "Litoral leste, Lagoa do Paraíso e Lagoa Azul", "Lagoas permanentes alimentadas pelo lençol freático", { st: "09:00", en: "14:00", p: "jer", h: 1 }),
    S("w", "Descanso", "", { st: "14:30", en: "17:00", p: "jer" }),
    S("f", "Jantar na vila", "", { st: "19:30", p: "jer" }) ] },
  "2026-12-19": { note: "", slots: [
    S("n", "Pedra Furada", "Caminhada pela praia", { st: "08:30", en: "11:30", p: "jer", h: 1 }),
    S("n", "Kitesurf (opcional)", "Dezembro é época de vento forte", { st: "14:00", en: "17:00", p: "jer" }),
    S("n", "Último pôr do sol na Duna", "", { p: "jer" }) ] },
  "2026-12-20": { note: "Transição Ceará para Amazónia. Confirmar folga entre os dois voos.", slots: [
    S("l", "Check-out em Jericoacoara", "", { p: "jer", b: "h3" }),
    S("x", "Voo Jericoacoara para Fortaleza", "", { p: "for", b: "f2", h: 1 }),
    S("x", "Voo Fortaleza para Manaus", "Cerca de 3h25", { p: "mao", b: "f3", h: 1 }),
    S("l", "Check-in em Manaus", "", { p: "mao", b: "h4" }),
    S("c", "Meio dia de cidade, Teatro Amazonas", "Se o horário do voo o permitir, e briefing da semana", { p: "mao" }) ] },
  "2026-12-21": { note: "", slots: [
    S("l", "Check-out em Manaus", "", { st: "08:00", p: "mao", b: "h4" }),
    S("x", "Barco para a comunidade", "Hora e meia a duas horas de Manaus", { st: "08:30", en: "10:30", p: "tum", h: 1 }),
    S("l", "Check-in na pousada comunitária", "", { st: "10:30", p: "tum", b: "h5" }),
    S("n", "Canoagem nos igarapés ao fim da tarde", "Mata alagada de Dezembro", { st: "16:30", en: "18:00", p: "tum" }),
    S("n", "Focagem nocturna de jacarés", "", { st: "20:00", en: "21:30", p: "tum", h: 1 }) ] },
  "2026-12-22": { note: "", slots: [
    S("n", "Anavilhanas e aldeia Tatuyo", "Arquipélago fluvial, roda de conversa e pintura", { st: "08:00", en: "14:00", p: "ana", h: 1 }),
    S("n", "Trilha com um morador", "Plantas medicinais e repelentes naturais", { st: "16:00", en: "17:30", p: "tum" }),
    S("f", "Jantar na comunidade", "", { st: "19:00", p: "tum" }) ] },
  "2026-12-23": { note: "Aldeias a seis a doze horas de voadeira não são alcançáveis no dia do voo. O primeiro contacto fica em São Gabriel.", slots: [
    S("l", "Check-out da pousada comunitária", "", { st: "06:30", p: "tum", b: "h5" }),
    S("x", "Barco de regresso a Manaus", "", { st: "07:00", en: "09:00", p: "mao", h: 1 }),
    S("x", "Voo Manaus para São Gabriel da Cachoeira", "Dia dependente das frequências da Azul", { p: "sjl", b: "f4", h: 1 }),
    S("l", "Check-in em São Gabriel", "", { p: "sjl", b: "h6" }),
    S("c", "Encontro com a FOIRN", "", { p: "sjl", b: "p2" }) ] },
  "2026-12-24": { note: "O alojamento em São Gabriel nas noites de 23 e 24 só é compatível com aldeias próximas da cidade. Aldeias distantes exigem pernoita na aldeia, decisão a tomar com a FOIRN.", slots: [
    S("c", "Vivência em aldeia", "Acesso mediado pela FOIRN e autorizado pela FUNAI", { p: "sjl", b: "p1", h: 1 }),
    S("r", "Cerimónia por via séria (opcional)", "Só por tradição reconhecida, após triagem de saúde", { p: "sjl", b: "p4", h: 1 }) ] },
  "2026-12-25": { note: "", slots: [
    S("l", "Check-out em São Gabriel", "", { p: "sjl", b: "h6" }),
    S("x", "Voo São Gabriel para Manaus", "", { p: "mao", b: "f5", h: 1 }),
    S("l", "Check-in em Manaus", "", { p: "mao", b: "h7" }) ] },
  "2026-12-26": { note: "", slots: [
    S("l", "Check-out em Manaus", "", { p: "mao", b: "h7" }),
    S("n", "Encontro das Águas (opcional)", "Só se o voo de regresso for ao fim do dia", { p: "enc" }),
    S("x", "Voo Manaus para Genebra", "Via Lisboa, por confirmar", { p: "mao", b: "f6", h: 1 }) ] },
};

/* ============ FONTES (consultadas em Out 2026) ============ */
const SRC = {
  cdc: ["CDC Yellow Book 2024, Brasil", "https://wwwnc.cdc.gov/travel/yellowbook/2024/preparing/yellow-fever-vaccine-malaria-prevention-by-country/brazil"],
  cdc18: ["CDC Yellow Book 2018, Brasil", "https://relief.unboundmedicine.com/relief/pview/cdc-yellow-book/204522/all/Brazil"],
  cdc10: ["Alerta CDC febre amarela (U. Toledo)", "https://wordpress.utoledo.edu/disastermedicine/?p=8720"],
  ptvisa: ["Decreto 43/2003, isenção de vistos PT BR", "https://diariodarepublica.pt/dr/detalhe/decreto/43-2003-494051"],
  volt: ["Esse Mundo É Nosso, voltagem por cidade", "https://www.essemundoenosso.com.br/qual-a-voltagem-nas-cidades-do-brasil-antes-de-viajar/"],
  plug: ["Engenharia 360, tomadas no mundo", "https://engenharia360.com/guia-sobre-tomadas-e-voltagens-no-mundo/"],
  jcl: ["Climatempo, climatologia Jericoacoara", "https://www.climatempo.com.br/climatologia/5020/jericoacoara-ce"],
  mcl: ["Climatempo, climatologia Manaus", "https://www.climatempo.com.br/climatologia/25/manaus-am"],
  md: ["Melhores Destinos, quando ir a Jeri", "https://guia.melhoresdestinos.com.br/quando-ir-jericoacoara-melhor-epoca.html"],
  tts: ["Diário do Turismo, taxa Jeri 2026", "https://diariodoturismo.com.br/taxa-de-turismo-jericoacoara-2026-veja-valor-atualizado-e-quem-precisa-pagar/"],
  jch: ["BlaBlaCar, como chegar a Jeri (Jun 2026)", "https://blog.blablacar.com.br/dicas/como-chegar-em-jericoacoara-2"],
  jjd: ["O Povo, aeroporto de Jericoacoara (Set 2026)", "https://mais.opovo.com.br/jornal/economia/2026/09/03/internacionalizacao-do-aeroporto-de-jericoacoara-fica-para-depois-das-obras-de-ate-tres-anos.html"],
  gol: ["Gol, voo Fortaleza Manaus (Mai 2026)", "https://www.voegol.com.br/sobre-a-gol/imprensa/gol-fortalece-a-conectividade-norte-nordeste-com-retomada-de-voos-diretos-entre-manaus-e-fortaleza"],
  azul: ["Azul, tarifas São Gabriel", "https://passagens.voeazul.com.br/pt/voos-de-são-gabriel-da-cachoeira"],
  sky: ["Skyscanner, Manaus São Gabriel", "https://www.espanol.skyscanner.com/rutas/mao/sjl/manaos-a-sao-gabriel.html"],
  tap: ["O Povo, TAP Fortaleza Lisboa (Mar 2026)", "https://www.opovo.com.br/noticias/economia/2026/03/05/rotas-de-fortaleza-para-paris-e-lisboa-vao-ganhar-mais-voos.html"],
  cq1: ["Diário do Nordeste, Canoa Quebrada", "https://diariodonordeste.verdesmares.com.br/estilo-de-vida/viagem/canoa-quebrada-onde-fica-como-chegar-e-o-que-fazer-1.3523323"],
  cq2: ["Viagens e Caminhos, Canoa Quebrada", "https://www.viagensecaminhos.com/canoa-quebrada-ce/"],
  cq3: ["Seguro Viagem, guia Canoa Quebrada", "https://www.seguroviagem.srv.br/blog/canoa-quebrada/"],
  cq4: ["Quanto Custa Viajar, Canoa Quebrada", "https://quantocustaviajar.com/blog/canoa-quebrada"],
  jfz: ["Viaje na Viagem, o que fazer em Jeri", "https://viajenaviagem.com/destino/jericoacoara/o-que-fazer"],
  jbg: ["Mala de Aventuras, buggy em Jeri", "https://maladeaventuras.com/passeio-de-bugre-em-jericoacoara-tatajuba/"],
  ta: ["Portal Amazônia, visitas ao Teatro", "https://portalamazonia.com/cultura/visitas-teatro-amazonas/"],
  une: ["Mercado & Eventos, Teatro Amazonas Unesco", "https://www.mercadoeeventos.com.br/?p=719073"],
  in3: ["Caderno Virtual de Turismo, IN 03/2015 FUNAI", "https://www.redalyc.org/journal/1154/115474121006/115474121006.pdf"],
  icm: ["ICMBio, regras de ingresso em TI", "https://www.gov.br/icmbio/pt-br/acesso-a-informacao/editais-diversos/editais-diversos-2023/anexo-iii-edital-de-credenciamento-pico-da-neblina.pdf"],
};

/* camadas práticas por reserva */
const BX = {
  f1: { links: [["TAP", "https://www.flytap.com"]], src: ["tap"], note: "Via Lisboa. A TAP passa a 9 voos semanais Fortaleza Lisboa a partir de Outubro de 2026." },
  f2: { noRoute: 1, src: ["jjd"], note: "Em Set 2026 o aeroporto de Jericoacoara só tinha rotas para Guarulhos (Latam, Gol) e Confins (Azul). Sem voo regular conhecido para Fortaleza." },
  f3: { days: [6], links: [["Gol", "https://www.voegol.com.br"]], src: ["gol"], note: "Gol, só ao sábado, 18h30 a 21h (hora local de Manaus)." },
  f4: { warn: "Cerca de 3 voos por semana, dias de Dezembro por confirmar", links: [["Azul", "https://www.voeazul.com.br"]], src: ["sky", "azul"], note: "Tarifas vistas a partir de cerca de R$ 930 por trajecto. O site da Azul mostra tarifas para 19 e 26 Dez." },
  f5: { warn: "Cerca de 3 voos por semana, dias de Dezembro por confirmar", links: [["Azul", "https://www.voeazul.com.br"]], src: ["sky", "azul"] },
  f6: { links: [["TAP", "https://www.flytap.com"]], warn: "Frequência Manaus Lisboa por confirmar" },
  t2: { note: "Canoa fica a cerca de 165 km a leste de Fortaleza e Jeri a cerca de 300 km a oeste, último troço em 4x4. Transfer 4x4 Fortaleza Jeri de 5 a 6 h, partilhado cerca de R$ 200 por pessoa, privado cerca de R$ 750.", src: ["cq3", "jch"] },
  p1: { links: [["FUNAI", "https://www.gov.br/funai"]], src: ["in3", "icm"], note: "Turismo em terra indígena só através de comunidades com Plano de Visitação aprovado (IN 03/2015). Documento com foto e autorização individual de ingresso." },
  p2: { links: [["FOIRN", "https://foirn.org.br"]] },
};
const NEWB = [B("x1", "taxa", "Taxa de Turismo Sustentável, Jericoacoara", { date: "2026-12-17", src: ["tts"], note: "R$ 41,50 por pessoa, válida até 10 dias. Pagar online antes no portal da Prefeitura de Jijoca." })];

/* camadas práticas por actividade (desc, dicas, preço, fontes) */
const SX = {
  s1: { tips: ["Ter reais em dinheiro e cartão à mão para o primeiro transporte"] },
  s5: { desc: "Cerca de 165 km, perto de três horas de estrada.", src: ["cq3"] },
  s7: { desc: "A Broadway é a Rua Dragão do Mar, com bares, restaurantes e forró ao vivo.", src: ["cq4"] },
  s8: { desc: "Bugueiros credenciados pela Prefeitura de Aracati, passeios das 8h às 17h, cinco paragens para fotos incluindo o símbolo nas falésias.", price: "R$ 300 por buggy, até 4 pessoas (valor publicado, a confirmar)",
    tips: ["Oásis da Lagoa do Skibunda, descida das dunas sentado numa prancha", "Alternativa, Rota das Falésias até Ponta Grossa, cerca de 2h30"], src: ["cq1", "cq3", "cq2"] },
  s12: { desc: "Mais de 450 km somando as duas distâncias a Fortaleza, último troço obrigatório em 4x4. Pode ultrapassar oito horas.", tips: ["Pagar a Taxa de Turismo Sustentável antes de chegar", "Confirmar se o transfer faz o percurso inteiro ou exige troca em Fortaleza"], src: ["cq3", "jch", "tts"] },
  s15: { desc: "Passeio Lado Leste, Árvore da Preguiça, Buraco Azul ou Lagun, Lagoa Azul e Lagoa do Paraíso. Duração de 5 a 6 horas.", price: "Entrada no Club Lagoa Azul R$ 40, no Alchymist R$ 35. Extremo Leste R$ 500 por veículo",
    tips: ["Escolher entre Buraco Azul e Lagun, e entre Lagoa Azul e Paraíso, para não repetir"], src: ["jfz", "jbg"] },
  s18: { desc: "Pela praia só com maré baixa. Pelo Morro do Serrote, pouco mais de meia hora a pé, com descida e subida. A luz é melhor de manhã.", tips: ["Consultar a tábua das marés para 19 Dez", "A maré baixa matinal coincide com lua cheia ou nova"], src: ["jfz"] },
  s19: { desc: "A época alta do kite em Jeri é de Julho a Novembro. Dezembro fica fora do pico.", src: ["md"] },
  s22: { tips: ["Sem voo regular conhecido, ver opções na verificação"], src: ["jjd"] },
  s23: { tips: ["A Gol só voa Fortaleza Manaus ao sábado, e 20 Dez é domingo"], src: ["gol"] },
  s25: { desc: "Visitas guiadas de terça a domingo, na lista do Património Mundial da Unesco desde 2026.", price: "R$ 20 inteira para visitantes de fora do Amazonas", src: ["ta", "une"] },
  s36: { desc: "Cerca de três voos por semana em Janeiro de 2026. Os dias de Dezembro têm de ser confirmados antes de fixar a semana.", src: ["sky", "azul"] },
  s39: { tips: ["Perguntar à FOIRN que comunidades têm Plano de Visitação aprovado", "Não fotografar nem divulgar imagens sem autorização da comunidade"], src: ["in3", "icm"] },
};
const DPATCH = { s19: ["Dezembro é época de vento forte", "Fora da época alta do kite"] };
const NOTES = {
  "2026-12-17": "Dia de estrada muito longo, de um lado ao outro de Fortaleza.",
  "2026-12-20": "Transição Ceará para Amazónia. Os dois voos previstos não existem neste dia segundo as fontes, ver opções na verificação.",
};
const NEWCHECKS = [
  { id: "c4", t: "Consulta de medicina de viagem, febre amarela e prevenção da malária para o Amazonas", done: false },
  { id: "c5", t: "Seguro com repatriamento e evacuação médica", done: false },
  { id: "c6", t: "Carregadores bivolt e adaptador tipo N", done: false },
  { id: "c7", t: "Mapas offline e guião descarregados antes da Amazónia", done: false },
];
const enrich = (x) => { const e = SX[x.id]; if (e) Object.assign(x, e); const p = DPATCH[x.id]; if (p && x.d === p[0]) x.d = p[1]; return x; };
BOOKINGS.forEach((b) => Object.assign(b, BX[b.id] || {}));
BOOKINGS.push(...NEWB);
Object.entries(DAYS).forEach(([d, v]) => { v.slots.forEach(enrich); if (NOTES[d]) v.note = NOTES[d]; });

/* migração de dados guardados pela versão 1, sem perder alterações */
function migrate(o) {
  if (o.v >= 2) return o;
  const m = clone(o), have = new Set(m.bookings.map((b) => b.id));
  m.bookings.forEach((b) => { if (BX[b.id]) Object.keys(BX[b.id]).forEach((k) => { if (k === "note" && b.note && b.note !== BOOKINGS.find((y) => y.id === b.id)?.note) return; b[k] = BX[b.id][k]; }); });
  NEWB.forEach((b) => !have.has(b.id) && m.bookings.push(clone(b)));
  Object.entries(m.days).forEach(([d, v]) => { v.slots.forEach(enrich); if (NOTES[d]) v.note = NOTES[d]; });
  const hc = new Set(m.checks.map((c) => c.id)); NEWCHECKS.forEach((c) => !hc.has(c.id) && m.checks.push({ ...c }));
  m.v = 2; m.log = [{ at: new Date().toISOString(), m: "Camadas práticas acrescentadas (versão 2)" }, ...m.log];
  return m;
}

/* preparação */
const PREP = [
  ["Clima em Dezembro", [
    ["Jericoacoara, mínima 26 °C, máxima 29 °C, cerca de 31 mm de chuva no mês (média de 30 anos).", ["jcl"]],
    ["Manaus, mínima 24 °C, máxima 30 °C, cerca de 295 mm de chuva, início da estação chuvosa. Contar com aguaceiros quase diários.", ["mcl"]],
    ["Desde meados de Dezembro até ao Carnaval a vila de Jeri enche de turistas brasileiros, reservar cedo.", ["md"]],
  ]],
  ["Saúde", [
    ["Vacina da febre amarela recomendada pelo CDC para todo o estado do Amazonas, a partir dos 9 meses de idade.", ["cdc"]],
    ["Não recomendada para itinerários limitados a Fortaleza (edição 2018), o que muda com a parte amazónica.", ["cdc18"]],
    ["Vacinar pelo menos 10 dias antes da viagem.", ["cdc10"]],
    ["Malária com transmissão em todo o Amazonas, quimioprofilaxia indicada pelo CDC para esse estado. Decidir em consulta de medicina de viagem.", ["cdc", "cdc18"]],
    ["Via ritual, revisão obrigatória da medicação com o médico antes de partir.", []],
  ]],
  ["Documentos e autorizações", [
    ["Cidadãos portugueses estão isentos de visto até 90 dias para turismo. Outras nacionalidades, confirmar no consulado do Brasil.", ["ptvisa"]],
    ["Taxa de Turismo Sustentável de Jeri, R$ 41,50 por pessoa até 10 dias, paga online antes.", ["tts"]],
    ["Terras indígenas, visita turística só com Plano de Visitação aprovado, documento com foto e autorização individual.", ["in3", "icm"]],
  ]],
  ["Electricidade", [
    ["Ceará em 220 V (Fortaleza, Jeri, Canoa), Amazonas em 127 V (Manaus).", ["volt"]],
    ["Tomada brasileira tipo N, norma NBR 14136. Na Suíça usam-se os tipos C e J.", ["plug"]],
    ["Verificar que todos os carregadores aceitam 100 a 240 V.", []],
  ]],
  ["Dinheiro e rede", [
    ["Levar reais em dinheiro para comunidades e aldeias, perguntar à Poranduba e à FOIRN que meios de pagamento aceitam.", []],
    ["Contar com rede limitada ou nula no rio e nas aldeias. Descarregar mapas offline e exportar o guião antes de 21 Dez.", []],
  ]],
  ["Equipamento", [
    ["Selva, repelente, roupa comprida leve, capa de chuva, sacos estanques, lanterna frontal, calçado que possa molhar.", []],
    ["Praia e dunas, chapéu, protector solar, óculos, sandálias para ruas de areia.", []],
  ]],
];
const PREP_SRC = ["Informação factual com fonte indicada. Linhas sem fonte são recomendações de preparação."];

const SEED = {
  v: 2,
  trip: { name: "Brasil, praia e Amazónia", start: "2026-12-14", end: "2026-12-26", party: "2 adultos", origin: "Genebra",
    rules: { maxHeavy: 2, siesta: false, checkoutBy: "10:00" } },
  places: PLACES, bookings: BOOKINGS, days: DAYS,
  checks: [
    { id: "c1", t: "Confirmar dias de voo Manaus São Gabriel antes de fixar o resto da semana", done: false },
    { id: "c2", t: "Triagem médica e revisão da medicação antes de qualquer cerimónia", done: false },
    { id: "c3", t: "Escolher alojamentos por faixa de conforto (misto)", done: false },
    ...NEWCHECKS,
  ],
  log: [],
};

/* ============ UTILITÁRIOS ============ */
const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const dt = (iso) => new Date(iso + "T12:00:00Z");
const addD = (iso, k) => { const d = dt(iso); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10); };
const range = (a, b) => { const o = []; for (let d = a; d <= b; d = addD(d, 1)) o.push(d); return o; };
const fmt = (iso) => { const d = dt(iso); return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MO[d.getUTCMonth()]}`; };
const mins = (t) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const TY = {
  x: ["Transporte", "#3d5a73"], l: ["Alojamento", "#4a2e17"], f: ["Refeição", "#b0702a"], c: ["Cultura", "#6f4a87"],
  n: ["Natureza", "#1d6b4f"], s: ["Espectáculo", "#a33d5c"], w: ["Descanso", "#7d8a86"], r: ["Ritual", "#6b5a2e"],
};
const STATUS = { todo: ["A reservar", "#8a6d1f"], urgent: ["Urgente", "#b8432f"], confirmed: ["Confirmado", "#1d6b4f"] };
const bmap = (s) => Object.fromEntries(s.bookings.map((b) => [b.id, b]));
const isLocked = (slot, s) => !!slot.b && bmap(s)[slot.b]?.status === "confirmed";

/* ============ MOTOR DE REGRAS ============ */
function rules(s) {
  const out = [], bm = bmap(s), R = s.trip.rules;
  const dates = range(s.trip.start, s.trip.end);
  dates.forEach((d) => {
    const sl = s.days[d]?.slots || [];
    // sobreposição de horários para a mesma pessoa
    for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) {
      const a = sl[i], b = sl[j];
      if (a.st && a.en && b.st && b.en && (a.who === b.who || !a.who || !b.who)) {
        if (mins(a.st) < mins(b.en) && mins(b.st) < mins(a.en))
          out.push({ lv: "erro", d, id: b.id, m: `«${b.t}» sobrepõe-se a «${a.t}» sem indicação de quem faz o quê` });
      }
    }
    // check-in imediatamente a seguir à chegada
    sl.forEach((x, i) => {
      if (x.ty === "l" && x.b && bm[x.b]?.k === "hotel" && bm[x.b].from === d) {
        const arr = sl.slice(0, i).map((y, k) => (y.ty === "x" ? k : -1)).filter((k) => k >= 0).pop();
        if (arr !== undefined && arr !== i - 1)
          out.push({ lv: "erro", d, id: x.id, m: `Check-in de «${bm[x.b].t}» não vem logo a seguir à chegada, as malas ficariam por depositar` });
      }
      if (x.ty === "l" && x.b && bm[x.b]?.k === "hotel" && bm[x.b].to === d && x.st && mins(x.st) > mins(R.checkoutBy))
        out.push({ lv: "aviso", d, id: x.id, m: `Check-out depois das ${R.checkoutBy}` });
    });
    const heavy = sl.filter((x) => x.h).length;
    if (heavy > R.maxHeavy) out.push({ lv: "aviso", d, m: `${heavy} actividades pesadas, o limite é ${R.maxHeavy}` });
    if (R.siesta && heavy >= 2 && !sl.some((x) => x.ty === "w" && mins(x.st) <= 15 * 60 && mins(x.en) >= 13 * 60))
      out.push({ lv: "aviso", d, m: "Dia intenso sem descanso entre as 13h e as 15h" });
  });
  // cobertura das noites
  dates.slice(0, -1).forEach((d) => {
    const c = s.bookings.filter((b) => b.k === "hotel" && b.from <= d && d < b.to);
    if (c.length === 0) out.push({ lv: "erro", d, m: "Noite sem alojamento" });
    if (c.length > 1) out.push({ lv: "erro", d, m: `Noite com ${c.length} alojamentos` });
  });
  // reservas confirmadas incompletas
  s.bookings.forEach((b) => {
    if (b.status === "confirmed" && !b.ref) out.push({ lv: "aviso", m: `«${b.t}» confirmado sem número de reserva` });
    if (b.status === "confirmed" && b.k === "hotel" && (!b.addr || !b.tel)) out.push({ lv: "aviso", m: `«${b.t}» sem morada ou telefone` });
  });
  // voos sem rota ou fora dos dias de operação conhecidos
  s.bookings.forEach((b) => {
    if (b.k !== "voo" || b.status === "confirmed") return;
    if (b.noRoute) out.push({ lv: "erro", d: b.date, m: `«${b.t}» sem voo regular conhecido` });
    else if (b.days && b.date && !b.days.includes(dt(b.date).getUTCDay()))
      out.push({ lv: "erro", d: b.date, m: `«${b.t}» só opera ${b.days.map((x) => WD[x]).join(", ")}, e ${fmt(b.date)} não é um desses dias` });
    else if (b.warn) out.push({ lv: "aviso", d: b.date, m: `«${b.t}», ${b.warn[0].toLowerCase() + b.warn.slice(1)}` });
  });
  // referências partidas
  dates.forEach((d) => (s.days[d]?.slots || []).forEach((x) => {
    if (x.b && !bm[x.b]) out.push({ lv: "erro", d, id: x.id, m: `«${x.t}» aponta para uma reserva inexistente` });
  }));
  return out;
}

/* ============ ESTILO ============ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Figtree:wght@400;500;600&display=swap');
.gv{--bg:#eef2ef;--ink:#12261f;--soft:#5b6b65;--line:#d3ddd8;--card:#fff;--sand:#d9a441;--forest:#1d6b4f;--negro:#4a2e17;--alert:#b8432f;
font-family:Figtree,system-ui,sans-serif;color:var(--ink);background:var(--bg);min-height:100vh;padding:16px 14px 60px;max-width:760px;margin:0 auto;font-size:14px;line-height:1.5}
.gv h1,.gv h2,.gv h3{font-family:'Bricolage Grotesque',Figtree,sans-serif;margin:0;letter-spacing:-.01em}
.gv h1{font-size:30px;font-weight:700;line-height:1.05}.gv h2{font-size:19px;font-weight:700}.gv h3{font-size:16px;font-weight:500}
.gv button{font:inherit;cursor:pointer}.gv button:focus-visible,.gv input:focus-visible,.gv select:focus-visible,.gv textarea:focus-visible{outline:2px solid var(--forest);outline-offset:2px}
.sub{color:var(--soft);font-size:13px}
.strip{display:grid;grid-template-columns:repeat(13,1fr);gap:3px;margin:16px 0 6px}
.cell{border:none;border-radius:6px;padding:6px 0 5px;color:#fff;text-align:center;font-size:11px;line-height:1.15;position:relative}
.cell b{display:block;font-size:15px;font-family:'Bricolage Grotesque',sans-serif}
.cell .dot{position:absolute;top:3px;right:3px;width:6px;height:6px;border-radius:50%;background:#fff}
.cell.sel{box-shadow:0 0 0 2px var(--ink)}
.tabs{display:flex;gap:2px;overflow-x:auto;border-bottom:1px solid var(--line);margin:14px 0 16px;scrollbar-width:none}
.tab{background:none;border:none;border-bottom:2px solid transparent;padding:9px 11px;color:var(--soft);white-space:nowrap;font-weight:500}
.tab.on{color:var(--ink);border-bottom-color:var(--ink)}
.day{background:var(--card);border-radius:10px;margin-bottom:12px;overflow:hidden;border-left:5px solid var(--sand)}
.dayh{padding:12px 14px 8px;display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.note{margin:0 14px 10px;font-size:12.5px;color:#6b5320;background:#faf3e2;padding:7px 10px;border-radius:6px}
.slot{display:grid;grid-template-columns:46px 1fr;gap:8px;padding:7px 14px;border-top:1px solid #f0f3f1;background:none;border-left:none;border-right:none;border-bottom:none;width:100%;text-align:left;color:inherit}
.slot:hover{background:#f7faf8}
.tm{font-size:12px;color:var(--soft);font-variant-numeric:tabular-nums;padding-top:2px}
.tt{font-weight:600;font-size:13.5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.dd{font-size:12.5px;color:var(--soft)}
.pill{font-size:11px;padding:1px 7px;border-radius:20px;font-weight:600;white-space:nowrap}
.iss{font-size:12px;padding:5px 10px;border-radius:6px;margin:4px 14px}
.iss.erro{background:#f8e3df;color:#7e2717}.iss.aviso{background:#f6eed7;color:#6b5320}
.add{background:none;border:1px dashed var(--line);color:var(--soft);border-radius:6px;padding:6px;margin:8px 14px 12px;width:calc(100% - 28px)}
.card{background:var(--card);border-radius:10px;padding:12px 14px;margin-bottom:10px}
.row{display:flex;justify-content:space-between;gap:10px;align-items:center}
.btn{border:none;border-radius:7px;padding:9px 14px;font-weight:600;background:var(--ink);color:#fff}
.btn.ghost{background:none;color:var(--ink);border:1px solid var(--line)}.btn.red{background:var(--alert)}
.btn:disabled{opacity:.45;cursor:default}
.modal{position:fixed;inset:0;background:rgba(18,38,31,.45);display:flex;align-items:flex-end;justify-content:center;z-index:20}
.sheet{background:#fff;width:100%;max-width:560px;border-radius:14px 14px 0 0;padding:18px 16px 22px;max-height:88vh;overflow:auto}
.f{display:block;margin-bottom:10px;font-size:12.5px;color:var(--soft)}
.f input,.f select,.f textarea{display:block;width:100%;box-sizing:border-box;margin-top:3px;padding:8px 9px;border:1px solid var(--line);border-radius:7px;font:inherit;color:var(--ink);background:#fff}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bar{height:8px;background:#dfe6e2;border-radius:8px;overflow:hidden}.bar i{display:block;height:100%;background:var(--forest)}
.op{border:1px solid var(--line);border-radius:8px;padding:9px 11px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start}
.op.bad{opacity:.6;background:#faf5f4}
.more{margin:0 14px 10px 68px;padding:8px 10px;background:#f4f8f6;border-radius:8px;font-size:13px}.more p{margin:0 0 6px}
.tip{padding-left:12px;border-left:2px solid var(--forest)}
.src{display:block;font-size:11.5px;margin-top:4px}.src a{color:var(--soft);margin-right:10px}
.lk{color:var(--forest);font-weight:600;margin-right:12px}
@media (prefers-reduced-motion:no-preference){.sheet{animation:up .22s ease-out}@keyframes up{from{transform:translateY(30px);opacity:.6}}}
`;

/* ============ COMPONENTES ============ */
function Strip({ s, issues, sel, onSel }) {
  const dates = range(s.trip.start, s.trip.end);
  return (
    <div className="strip" role="list" aria-label="Dias da viagem">
      {dates.map((d) => {
        const ps = (s.days[d]?.slots || []).map((x) => s.places[x.p]?.r).filter(Boolean);
        const ce = ps.includes("ce"), am = ps.includes("am");
        const bg = ce && am ? "linear-gradient(90deg,var(--sand) 50%,var(--forest) 50%)" : am ? "var(--forest)" : "var(--sand)";
        const err = issues.some((i) => i.d === d && i.lv === "erro");
        return (
          <button key={d} role="listitem" className={"cell" + (sel === d ? " sel" : "")} style={{ background: bg }}
            onClick={() => onSel(d)} aria-label={fmt(d) + (err ? ", com erros" : "")}>
            {err && <span className="dot" style={{ background: "#fff", boxShadow: "0 0 0 2px var(--alert)" }} />}
            {WD[dt(d).getUTCDay()]}<b>{dt(d).getUTCDate()}</b>
          </button>
        );
      })}
    </div>
  );
}

const Src = ({ ids }) => (ids && ids.length ? <span className="src">{ids.map((k) => SRC[k] && <a key={k} href={SRC[k][1]} target="_blank" rel="noopener noreferrer">{SRC[k][0]}</a>)}</span> : null);

function Itinerary({ s, issues, onEdit, onAdd, focus }) {
  const bm = bmap(s); const [open, setOpen] = useState(null);
  useEffect(() => { if (focus) document.getElementById("d-" + focus)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [focus]);
  return range(s.trip.start, s.trip.end).map((d, i) => {
    const day = s.days[d] || { note: "", slots: [] };
    const ps = day.slots.map((x) => s.places[x.p]?.r);
    const col = ps.includes("am") ? "var(--forest)" : "var(--sand)";
    const di = issues.filter((x) => x.d === d && !x.id);
    return (
      <section key={d} id={"d-" + d} className="day" style={{ borderLeftColor: col }}>
        <div className="dayh"><h3>Dia {i + 1}, {fmt(d)}</h3><span className="sub">{day.slots.filter((x) => x.h).length} pesadas</span></div>
        {day.note && <p className="note">{day.note}</p>}
        {di.map((x, k) => <div key={k} className={"iss " + x.lv}>{x.m}</div>)}
        {day.slots.map((x) => {
          const lk = isLocked(x, s), bk = bm[x.b], si = issues.filter((y) => y.id === x.id);
          const more = !!(x.desc || (x.tips && x.tips.length) || x.price || (x.src && x.src.length) || (bk && (bk.note || bk.links)));
          const isO = open === x.id;
          return (
            <div key={x.id}>
              <button className="slot" aria-expanded={isO} onClick={() => setOpen(isO ? null : x.id)}>
                <span className="tm">{x.st || "··"}{x.en ? <><br />{x.en}</> : null}</span>
                <span>
                  <span className="tt">
                    <span className="pill" style={{ background: TY[x.ty][1] + "1c", color: TY[x.ty][1] }}>{TY[x.ty][0]}</span>
                    {x.t}{lk && <span title="Reservado, não pode ser alterado">🔴</span>}
                    {more && <span className="sub" aria-hidden>{isO ? "▴" : "▾"}</span>}
                  </span>
                  {x.d && <span className="dd" style={{ display: "block" }}>{x.d}</span>}
                  {x.who && <span className="dd" style={{ display: "block" }}>Quem, {x.who}</span>}
                  {bk && !lk && <span className="dd" style={{ display: "block", color: STATUS[bk.status][1] }}>{STATUS[bk.status][0]}, {bk.t}</span>}
                </span>
              </button>
              {si.map((y, k) => <div key={k} className={"iss " + y.lv}>{y.m}</div>)}
              {isO && <div className="more">
                {x.desc && <p>{x.desc}</p>}
                {x.price && <p><strong>Preço</strong> {x.price}</p>}
                {x.tips && x.tips.map((t, k) => <p key={k} className="tip">{t}</p>)}
                {bk && bk.note && <p className="dd">{bk.note}</p>}
                {bk && bk.links && <p>{bk.links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="lk">{l}</a>)}</p>}
                <Src ids={[...(x.src || []), ...((bk && bk.src) || [])].filter((v, k, a) => a.indexOf(v) === k)} />
                <button className="btn ghost" style={{ marginTop: 8, padding: "6px 12px" }} onClick={() => onEdit(d, x.id)}>Editar</button>
              </div>}
              {!more && isO && <div className="more"><button className="btn ghost" style={{ padding: "6px 12px" }} onClick={() => onEdit(d, x.id)}>Editar</button></div>}
            </div>
          );
        })}
        <button className="add" onClick={() => onAdd(d)}>Adicionar actividade</button>
      </section>
    );
  });
}

function Prep() {
  return (<>
    <p className="sub" style={{ marginTop: 0 }}>{PREP_SRC[0]}</p>
    {PREP.map(([h, items]) => (
      <div key={h} className="card">
        <h2 style={{ marginBottom: 8 }}>{h}</h2>
        {items.map(([t, src], k) => <div key={k} style={{ padding: "5px 0", borderTop: k ? "1px solid #eef2ef" : "none" }}>{t}<Src ids={src} /></div>)}
      </div>
    ))}
    <div className="card">
      <h2 style={{ marginBottom: 8 }}>Todas as fontes</h2>
      {Object.entries(SRC).map(([k, [t, u]]) => <div key={k}><a href={u} target="_blank" rel="noopener noreferrer" className="lk">{t}</a></div>)}
    </div>
  </>);
}

function SlotEditor({ s, date, id, onSave, onDelete, onClose }) {
  const orig = id ? s.days[date].slots.find((x) => x.id === id) : { id: "s" + Date.now(), ty: "c", t: "", d: "", st: "", en: "", p: "", b: "", h: 0, who: "" };
  const [x, setX] = useState({ ...orig }); const [nd, setNd] = useState(date);
  const lk = id && isLocked(orig, s);
  const set = (k) => (e) => setX({ ...x, [k]: e.target.type === "checkbox" ? (e.target.checked ? 1 : 0) : e.target.value });
  return (
    <div className="modal" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}>
      <h2 style={{ marginBottom: 12 }}>{id ? "Editar actividade" : "Nova actividade"}</h2>
      {lk && <p className="iss erro" style={{ margin: "0 0 12px" }}>Esta actividade está ligada a uma reserva confirmada. Para a alterar, desbloqueia primeiro a reserva no separador Reservas.</p>}
      <fieldset disabled={lk} style={{ border: "none", padding: 0, margin: 0 }}>
        <label className="f">Título<input value={x.t} onChange={set("t")} /></label>
        <label className="f">Detalhe<input value={x.d} onChange={set("d")} /></label>
        <div className="grid2">
          <label className="f">Início<input type="time" value={x.st} onChange={set("st")} /></label>
          <label className="f">Fim<input type="time" value={x.en} onChange={set("en")} /></label>
          <label className="f">Tipo<select value={x.ty} onChange={set("ty")}>{Object.entries(TY).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
          <label className="f">Dia<select value={nd} onChange={(e) => setNd(e.target.value)}>{range(s.trip.start, s.trip.end).map((d) => <option key={d} value={d}>{fmt(d)}</option>)}</select></label>
          <label className="f">Local<select value={x.p} onChange={set("p")}><option value="">Nenhum</option>{Object.entries(s.places).map(([k, v]) => <option key={k} value={k}>{v.n}</option>)}</select></label>
          <label className="f">Reserva ligada<select value={x.b} onChange={set("b")}><option value="">Nenhuma</option>{s.bookings.map((b) => <option key={b.id} value={b.id}>{b.t}</option>)}</select></label>
        </div>
        <label className="f">Quem faz (se os adultos se separarem)<input value={x.who} onChange={set("who")} placeholder="Ambos" /></label>
        <label className="f" style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={!!x.h} onChange={set("h")} style={{ width: "auto", margin: 0 }} />Actividade pesada</label>
      </fieldset>
      <div className="row" style={{ marginTop: 14 }}>
        {id && !lk ? <button className="btn red" onClick={() => { if (window.confirm(`Suprimir «${orig.t}»? Esta acção fica registada no histórico.`)) onDelete(); }}>Suprimir</button> : <span />}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" disabled={lk || !x.t} onClick={() => {
            if (nd !== date && !window.confirm(`Mudar «${x.t}» de ${fmt(date)} para ${fmt(nd)}?`)) return;
            onSave(x, nd);
          }}>Guardar</button>
        </div>
      </div>
    </div></div>
  );
}

function BookingEditor({ s, id, onSave, onClose }) {
  const orig = s.bookings.find((b) => b.id === id);
  const [b, setB] = useState({ ...orig });
  const set = (k) => (e) => setB({ ...b, [k]: e.target.value });
  return (
    <div className="modal" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}>
      <h2 style={{ marginBottom: 4 }}>{orig.t}</h2>
      <p className="sub" style={{ margin: "0 0 12px" }}>{orig.k}{orig.from ? `, ${fmt(orig.from)} a ${fmt(orig.to)}` : orig.date ? `, ${fmt(orig.date)}` : ""}</p>
      <label className="f">Estado<select value={b.status} onChange={set("status")}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
      <label className="f">Nome<input value={b.t} onChange={set("t")} /></label>
      <div className="grid2">
        <label className="f">N.º de reserva<input value={b.ref} onChange={set("ref")} /></label>
        <label className="f">Telefone<input value={b.tel} onChange={set("tel")} /></label>
      </div>
      <label className="f">Morada<input value={b.addr} onChange={set("addr")} /></label>
      {b.k === "hotel" && <div className="grid2">
        <label className="f">Check-in a partir das<input type="time" value={b.ci} onChange={set("ci")} /></label>
        <label className="f">Check-out até às<input type="time" value={b.co} onChange={set("co")} /></label>
      </div>}
      <label className="f">Notas<textarea rows={2} value={b.note} onChange={set("note")} /></label>
      <div className="row" style={{ marginTop: 8 }}>
        <span />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={() => {
            if (orig.status === "confirmed" && b.status !== "confirmed" && !window.confirm("Desbloquear uma reserva confirmada? As actividades ligadas passam a poder ser alteradas.")) return;
            if (b.status === "confirmed" && orig.status !== "confirmed" && !b.ref && !window.confirm("Confirmar sem número de reserva?")) return;
            onSave(b);
          }}>Guardar</button>
        </div>
      </div>
    </div></div>
  );
}

function Bookings({ s, onOpen }) {
  const done = s.bookings.filter((b) => b.status === "confirmed").length, tot = s.bookings.length;
  return (<>
    <div className="card"><div className="row" style={{ marginBottom: 8 }}><strong>{done} de {tot} confirmadas</strong><span>{Math.round((done / tot) * 100)}%</span></div><div className="bar"><i style={{ width: `${(done / tot) * 100}%` }} /></div></div>
    {["urgent", "todo", "confirmed"].map((st) => {
      const l = s.bookings.filter((b) => b.status === st); if (!l.length) return null;
      return (<div key={st} style={{ marginBottom: 18 }}>
        <h2 style={{ color: STATUS[st][1], marginBottom: 8 }}>{STATUS[st][0]}</h2>
        {l.map((b) => (
          <div key={b.id} className="card" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => onOpen(b.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(b.id)}>
            <div className="row"><strong>{b.status === "confirmed" ? "🔴 " : ""}{b.t}</strong><span className="sub">{b.k}</span></div>
            <div className="dd">{b.from ? `${fmt(b.from)} a ${fmt(b.to)}` : b.date ? fmt(b.date) : "Sem data"}{b.ref ? `, reserva ${b.ref}` : ""}</div>
            {b.noRoute && <div className="dd" style={{ color: "var(--alert)" }}>Sem voo regular conhecido</div>}
            {b.note && <div className="dd">{b.note}</div>}
            {b.links && <div style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>{b.links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="lk">{l}</a>)}</div>}
            <span onClick={(e) => e.stopPropagation()}><Src ids={b.src} /></span>
          </div>
        ))}
      </div>);
    })}
  </>);
}

function Hotels({ s, onOpen }) {
  const hs = s.bookings.filter((b) => b.k === "hotel").sort((a, b) => (a.from < b.from ? -1 : 1));
  const nights = (b) => Math.round((dt(b.to) - dt(b.from)) / 864e5);
  return (<>
    <div className="card" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", color: "var(--soft)" }}><th style={{ padding: 6 }}>Datas</th><th style={{ padding: 6 }}>Alojamento</th><th style={{ padding: 6 }}>Noites</th></tr></thead>
        <tbody>{hs.map((h) => (<tr key={h.id} style={{ borderTop: "1px solid var(--line)" }}>
          <td style={{ padding: 6, whiteSpace: "nowrap" }}>{fmt(h.from)} a {fmt(h.to)}</td><td style={{ padding: 6 }}>{h.t}</td><td style={{ padding: 6 }}>{nights(h)}</td></tr>))}
          <tr style={{ borderTop: "1px solid var(--line)", fontWeight: 600 }}><td style={{ padding: 6 }} colSpan={2}>Total</td><td style={{ padding: 6 }}>{hs.reduce((a, h) => a + nights(h), 0)}</td></tr>
        </tbody>
      </table>
    </div>
    {hs.map((h) => (
      <button key={h.id} className="card" style={{ width: "100%", textAlign: "left", border: "none", display: "block", borderTop: `3px solid ${STATUS[h.status][1]}` }} onClick={() => onOpen(h.id)}>
        <div className="row"><strong>{h.t}</strong><span className="pill" style={{ background: STATUS[h.status][1], color: "#fff" }}>{STATUS[h.status][0]}</span></div>
        <div className="dd">Morada, {h.addr || "por preencher"}</div>
        <div className="dd">Telefone, {h.tel || "por preencher"}</div>
        <div className="dd">Reserva, {h.ref || "por preencher"}</div>
        <div className="dd">Check-in a partir das {h.ci || "?"} ({fmt(h.from)}), check-out até às {h.co || "?"} ({fmt(h.to)})</div>
      </button>
    ))}
  </>);
}

function Transport({ s }) {
  const bm = bmap(s);
  const rows = range(s.trip.start, s.trip.end).flatMap((d) => (s.days[d]?.slots || []).filter((x) => x.ty === "x").map((x) => ({ d, x, b: bm[x.b] })));
  return (<>
    <p className="sub" style={{ marginTop: 0 }}>Nenhum passe definido. Todos os trajectos são voos ou transfers avulsos, cada um com a sua reserva. Os erros de rota aparecem na Verificação.</p>
    {rows.map(({ d, x, b }) => (
      <div key={x.id} className="card">
        <div className="row"><strong>{x.t}</strong><span className="sub">{fmt(d)}</span></div>
        <div className="dd">{x.d || "Duração por confirmar"}{x.st ? `, ${x.st}${x.en ? " a " + x.en : ""}` : ""}</div>
        <div className="dd" style={{ color: b ? STATUS[b.status][1] : "var(--soft)" }}>{b ? `${STATUS[b.status][0]}${b.ref ? ", reserva " + b.ref : ""}` : "Sem reserva associada"}</div>
        {b && b.note && <div className="dd">{b.note}</div>}
        {b && b.links && <div>{b.links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="lk">{l}</a>)}</div>}
        <Src ids={b && b.src} />
      </div>
    ))}
  </>);
}

function MapView({ s }) {
  const order = [];
  range(s.trip.start, s.trip.end).forEach((d) => (s.days[d]?.slots || []).forEach((x) => { if (x.p && order[order.length - 1] !== x.p) order.push(x.p); }));
  const ids = [...new Set(order)], P = s.places;
  const lng = ids.map((k) => P[k].lng), lat = ids.map((k) => P[k].lat);
  const [x0, x1, y0, y1] = [Math.min(...lng), Math.max(...lng), Math.min(...lat), Math.max(...lat)];
  const W = 340, H = 170, pad = 22;
  const px = (k) => [pad + ((P[k].lng - x0) / (x1 - x0 || 1)) * (W - 2 * pad), pad + ((y1 - P[k].lat) / (y1 - y0 || 1)) * (H - 2 * pad)];
  return (<>
    <div className="card">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Esquema do percurso">
        <polyline points={order.map((k) => px(k).join(",")).join(" ")} fill="none" stroke="#9fb1a9" strokeWidth="1.2" strokeDasharray="4 3" />
        {ids.map((k) => { const [x, y] = px(k); const c = P[k].r === "am" ? "#1d6b4f" : "#d9a441";
          return <g key={k}><circle cx={x} cy={y} r="5" fill={c} stroke="#fff" strokeWidth="1.5" /><text x={x} y={y - 8} fontSize="7.5" textAnchor="middle" fill="#12261f">{P[k].n.split(",")[0]}</text></g>; })}
      </svg>
      <p className="sub" style={{ margin: "6px 0 0" }}>Esquema das posições relativas, escala não uniforme e sem contorno geográfico. A ordem segue o itinerário.</p>
    </div>
    {ids.map((k) => (
      <div key={k} className="card row">
        <span><strong>{P[k].n}</strong><span className="dd" style={{ display: "block" }}>{P[k].lat}, {P[k].lng}{P[k].ap ? ", coordenadas aproximadas a verificar" : ""}</span></span>
        <a href={`https://www.google.com/maps/search/?api=1&query=${P[k].lat},${P[k].lng}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--forest)", fontWeight: 600, whiteSpace: "nowrap" }}>Abrir no mapa</a>
      </div>
    ))}
  </>);
}

function Checklist({ s, issues, onToggle, onAddCheck, onOpen }) {
  const [t, setT] = useState("");
  const pend = s.bookings.filter((b) => b.status !== "confirmed").sort((a, b) => (a.status === "urgent" ? 0 : 1) - (b.status === "urgent" ? 0 : 1));
  return (<>
    <h2 style={{ marginBottom: 8 }}>Problemas detectados</h2>
    {issues.length === 0 ? <p className="sub">Nenhum. O plano respeita todas as regras activas.</p> :
      issues.map((x, i) => <div key={i} className={"iss " + x.lv} style={{ margin: "0 0 6px" }}>{x.d ? fmt(x.d) + ", " : ""}{x.m}</div>)}
    <h2 style={{ margin: "18px 0 8px" }}>Reservas por fazer</h2>
    {pend.map((b) => <button key={b.id} className="card" style={{ width: "100%", textAlign: "left", border: "none", display: "block" }} onClick={() => onOpen(b.id)}>
      <span style={{ color: STATUS[b.status][1], fontWeight: 600 }}>{STATUS[b.status][0]}</span>, {b.t}</button>)}
    <h2 style={{ margin: "18px 0 8px" }}>Outras tarefas</h2>
    {s.checks.map((c) => <label key={c.id} className="card" style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
      <input type="checkbox" checked={c.done} onChange={() => onToggle(c.id)} /><span style={{ textDecoration: c.done ? "line-through" : "none" }}>{c.t}</span></label>)}
    <div style={{ display: "flex", gap: 8 }}>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Nova tarefa" style={{ flex: 1, padding: 8, border: "1px solid var(--line)", borderRadius: 7, font: "inherit" }} />
      <button className="btn" disabled={!t} onClick={() => { onAddCheck(t); setT(""); }}>Adicionar</button>
    </div>
  </>);
}

/* ============ ASSISTENTE (propõe, nunca aplica sozinho) ============ */
const SYS = `És o assistente de um planeador de viagens. Recebes o estado da viagem em JSON e um pedido do utilizador.
Responde APENAS com JSON válido, sem texto antes ou depois e sem blocos de código, neste formato:
{"summary":"frase curta em português europeu","ops":[{"op":"add","date":"AAAA-MM-DD","after":"id ou vazio","slot":{"ty":"x|l|f|c|n|s|w|r","t":"título","d":"detalhe","st":"HH:MM ou vazio","en":"HH:MM ou vazio","p":"id de local ou vazio","b":"id de reserva ou vazio","h":0,"who":""}},{"op":"update","id":"id do slot","date":"novo dia se mudar, senão omitir","patch":{"campo":"valor"}},{"op":"delete","id":"id do slot","reason":"porquê"}],"questions":["dúvidas a colocar ao utilizador"]}
Regras absolutas: nunca toques em slots com "locked":true; não suprimas nada a não ser que o pedido o diga explicitamente; o check-in vem logo a seguir à chegada; check-out de manhã cedo; no máximo ${"{maxHeavy}"} actividades pesadas por dia; não inventes horários de voos, números de reserva, preços ou moradas, deixa vazio e pergunta; se houver conflito, não decidas, coloca opções em "questions".`;

function compact(s) {
  return {
    trip: s.trip, places: Object.fromEntries(Object.entries(s.places).map(([k, v]) => [k, v.n])),
    bookings: s.bookings.map((b) => ({ id: b.id, k: b.k, t: b.t, status: b.status, from: b.from, to: b.to, date: b.date })),
    days: Object.fromEntries(Object.entries(s.days).map(([d, v]) => [d, v.slots.map((x) => ({ ...x, locked: isLocked(x, s) }))])),
  };
}

function applyOps(s, ops) {
  const o = clone(s), log = [];
  ops.forEach((op) => {
    if (op.op === "add") {
      const day = o.days[op.date]; const sl = { id: "s" + Date.now() + Math.random().toString(36).slice(2, 6), ty: "c", t: "", d: "", st: "", en: "", p: "", b: "", h: 0, who: "", ...op.slot };
      const i = op.after ? day.slots.findIndex((x) => x.id === op.after) : -1;
      i >= 0 ? day.slots.splice(i + 1, 0, sl) : day.slots.push(sl); log.push(`Adicionado «${sl.t}» em ${fmt(op.date)}`);
    } else {
      const from = Object.keys(o.days).find((d) => o.days[d].slots.some((x) => x.id === op.id)); if (!from) return;
      const i = o.days[from].slots.findIndex((x) => x.id === op.id), x = o.days[from].slots[i];
      if (op.op === "delete") { o.days[from].slots.splice(i, 1); log.push(`Suprimido «${x.t}» (${op.reason || "sem motivo"})`); }
      else {
        Object.assign(x, op.patch || {});
        if (op.date && op.date !== from) { o.days[from].slots.splice(i, 1); o.days[op.date].slots.push(x); log.push(`Mudado «${x.t}» para ${fmt(op.date)}`); }
        else log.push(`Alterado «${x.t}»`);
      }
    }
  });
  o.log = [...log.map((m) => ({ at: new Date().toISOString(), m })), ...o.log].slice(0, 100);
  return o;
}

function Assistant({ s, issues, onApply }) {
  const [req, setReq] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [prop, setProp] = useState(null);
  const ask = async () => {
    setBusy(true); setErr(""); setProp(null);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYS.replace("{maxHeavy}", s.trip.rules.maxHeavy),
          messages: [{ role: "user", content: `Estado da viagem:\n${JSON.stringify(compact(s))}\n\nPedido:\n${req}` }] }),
      });
      const data = await r.json();
      const txt = (data.content || []).map((c) => c.text || "").join("").replace(/```json|```/g, "").trim();
      const j = JSON.parse(txt);
      const all = Object.values(s.days).flatMap((d) => d.slots);
      const ops = (j.ops || []).map((op) => {
        const x = all.find((y) => y.id === op.id);
        let ok = true, why = "", flag = "";
        if (op.op !== "add" && !x) { ok = false; why = "Actividade inexistente"; }
        else if (x && isLocked(x, s)) { ok = false; why = "Recusado, ligado a reserva confirmada"; }
        else if (op.op === "add" && (!s.days[op.date] || !op.slot?.t)) { ok = false; why = "Dia fora da viagem ou sem título"; }
        if (op.op === "delete") flag = "Supressão, exige validação explícita";
        if (op.op === "update" && op.date && x && !s.days[op.date]?.slots.includes(x)) flag = "Muda de dia, confirmar";
        const label = op.op === "add" ? `Adicionar «${op.slot?.t}» em ${op.date ? fmt(op.date) : "?"}` : op.op === "delete" ? `Suprimir «${x?.t}»${op.reason ? ", " + op.reason : ""}` : `Alterar «${x?.t}» ${JSON.stringify(op.patch || {})}${op.date ? ", para " + fmt(op.date) : ""}`;
        return { op, ok, why, flag, label, on: ok && op.op !== "delete" };
      });
      setProp({ summary: j.summary, questions: j.questions || [], ops });
    } catch (e) { setErr("A resposta não pôde ser interpretada. Reformula o pedido ou tenta de novo."); }
    setBusy(false);
  };
  const chosen = prop ? prop.ops.filter((o) => o.on).map((o) => o.op) : [];
  const preview = useMemo(() => (chosen.length ? rules(applyOps(s, chosen)) : null), [prop, s]);
  const cur = new Set(issues.map((i) => i.m)), fresh = preview ? preview.filter((i) => !cur.has(i.m)) : [];
  const toggle = (k) => setProp({ ...prop, ops: prop.ops.map((o, i) => (i === k ? { ...o, on: !o.on } : o)) });
  return (<>
    <p className="sub" style={{ marginTop: 0 }}>Descreve a alteração. O assistente só propõe, nada é aplicado sem a tua validação, e as reservas confirmadas são recusadas automaticamente.</p>
    <textarea rows={3} value={req} onChange={(e) => setReq(e.target.value)} placeholder="Por exemplo, acrescenta uma manhã de mergulho em Jericoacoara no dia 19"
      style={{ width: "100%", boxSizing: "border-box", padding: 10, border: "1px solid var(--line)", borderRadius: 8, font: "inherit" }} />
    <button className="btn" style={{ marginTop: 8 }} disabled={!req || busy} onClick={ask}>{busy ? "A preparar a proposta…" : "Pedir proposta"}</button>
    {err && <p className="iss erro" style={{ margin: "10px 0" }}>{err}</p>}
    {prop && <div style={{ marginTop: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Proposta</h2>
      <p style={{ marginTop: 0 }}>{prop.summary}</p>
      {prop.questions.map((q, i) => <p key={i} className="iss aviso" style={{ margin: "0 0 6px" }}>Pergunta, {q}</p>)}
      {prop.ops.map((o, i) => (
        <label key={i} className={"op" + (o.ok ? "" : " bad")}>
          <input type="checkbox" disabled={!o.ok} checked={o.on} onChange={() => toggle(i)} />
          <span><span style={{ fontWeight: 600 }}>{o.label}</span>
            {o.why && <span className="dd" style={{ display: "block", color: "var(--alert)" }}>{o.why}</span>}
            {o.flag && <span className="dd" style={{ display: "block", color: "#8a6d1f" }}>{o.flag}</span>}</span>
        </label>
      ))}
      {fresh.length > 0 && <><p className="sub">Problemas novos que estas alterações criariam</p>{fresh.map((x, i) => <div key={i} className={"iss " + x.lv} style={{ margin: "0 0 6px" }}>{x.d ? fmt(x.d) + ", " : ""}{x.m}</div>)}</>}
      <button className="btn" disabled={!chosen.length} onClick={() => { onApply(applyOps(s, chosen)); setProp(null); setReq(""); }}>Aplicar {chosen.length} alteração(ões)</button>
    </div>}
    {s.log.length > 0 && <><h2 style={{ margin: "22px 0 8px" }}>Histórico</h2>
      {s.log.slice(0, 15).map((l, i) => <div key={i} className="dd" style={{ padding: "3px 0" }}>{new Date(l.at).toLocaleString("pt-PT")}, {l.m}</div>)}</>}
  </>);
}

/* ============ APP ============ */
const TABS = [["it", "Itinerário"], ["ia", "Assistente"], ["rs", "Reservas"], ["ht", "Alojamentos"], ["tr", "Transportes"], ["mp", "Mapa"], ["pp", "Preparar"], ["ck", "Verificação"]];

export default function App() {
  const [s, setS] = useState(null), [tab, setTab] = useState("it"), [ed, setEd] = useState(null), [bk, setBk] = useState(null), [focus, setFocus] = useState(null), [saveErr, setSaveErr] = useState(false);
  useEffect(() => { (async () => {
    try { const r = await window.storage.get(KEY, false); setS(r && r.value ? migrate(JSON.parse(r.value)) : SEED); } catch { setS(SEED); }
  })(); }, []);
  useEffect(() => { if (!s) return; (async () => {
    try { const r = await window.storage.set(KEY, JSON.stringify(s), false); setSaveErr(!r); } catch { setSaveErr(true); }
  })(); }, [s]);
  const issues = useMemo(() => (s ? rules(s) : []), [s]);
  if (!s) return <div className="gv"><style>{CSS}</style><p className="sub">A carregar a viagem…</p></div>;

  const logged = (o, m) => ({ ...o, log: [{ at: new Date().toISOString(), m }, ...o.log].slice(0, 100) });
  const saveSlot = (x, nd) => { const o = clone(s); const { date } = ed; const day = o.days[date];
    const i = day.slots.findIndex((y) => y.id === x.id);
    if (i >= 0 && nd === date) day.slots[i] = x; else { if (i >= 0) day.slots.splice(i, 1); o.days[nd].slots.push(x); }
    setS(logged(o, `${i >= 0 ? "Alterado" : "Adicionado"} «${x.t}»${nd !== date ? " e mudado para " + fmt(nd) : ""}`)); setEd(null); };
  const delSlot = () => { const o = clone(s); const day = o.days[ed.date]; const x = day.slots.find((y) => y.id === ed.id);
    day.slots = day.slots.filter((y) => y.id !== ed.id); setS(logged(o, `Suprimido «${x.t}» manualmente`)); setEd(null); };
  const saveBk = (b) => { const o = clone(s); const i = o.bookings.findIndex((y) => y.id === b.id); const prev = o.bookings[i].status;
    o.bookings[i] = b; setS(logged(o, prev !== b.status ? `«${b.t}» passou a ${STATUS[b.status][0].toLowerCase()}` : `Reserva «${b.t}» actualizada`)); setBk(null); };
  const errs = issues.filter((i) => i.lv === "erro").length, warns = issues.length - errs;

  return (
    <div className="gv"><style>{CSS}</style>
      <header>
        <h1>{s.trip.name}</h1>
        <p className="sub" style={{ margin: "6px 0 0" }}>{fmt(s.trip.start)} a {fmt(s.trip.end)} 2026, {s.trip.party}, partida de {s.trip.origin}</p>
        <p style={{ margin: "6px 0 0", fontSize: 13 }}>
          <span style={{ color: errs ? "var(--alert)" : "var(--forest)", fontWeight: 600 }}>{errs} erro(s)</span>, <span style={{ color: "#8a6d1f" }}>{warns} aviso(s)</span>, {s.bookings.filter((b) => b.status === "confirmed").length} reserva(s) bloqueada(s)
          {saveErr && <span style={{ color: "var(--alert)" }}>, não foi possível guardar</span>}
        </p>
      </header>
      <Strip s={s} issues={issues} sel={focus} onSel={(d) => { setTab("it"); setFocus(d); }} />
      <p className="sub" style={{ margin: 0, fontSize: 12 }}>Areia para o Ceará, verde para a Amazónia. Toca num dia para lá ir.</p>
      <nav className="tabs">{TABS.map(([k, l]) => <button key={k} className={"tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}{k === "ck" && errs ? ` (${errs})` : ""}</button>)}</nav>
      <main>
        {tab === "it" && <Itinerary s={s} issues={issues} focus={focus} onEdit={(date, id) => setEd({ date, id })} onAdd={(date) => setEd({ date, id: null })} />}
        {tab === "ia" && <Assistant s={s} issues={issues} onApply={setS} />}
        {tab === "rs" && <Bookings s={s} onOpen={setBk} />}
        {tab === "ht" && <Hotels s={s} onOpen={setBk} />}
        {tab === "tr" && <Transport s={s} />}
        {tab === "mp" && <MapView s={s} />}
        {tab === "pp" && <Prep />}
        {tab === "ck" && <Checklist s={s} issues={issues} onOpen={setBk}
          onToggle={(id) => { const o = clone(s); const c = o.checks.find((x) => x.id === id); c.done = !c.done; setS(o); }}
          onAddCheck={(t) => { const o = clone(s); o.checks.push({ id: "c" + Date.now(), t, done: false }); setS(o); }} />}
      </main>
      <footer style={{ marginTop: 30, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <button className="btn ghost" onClick={() => { if (window.confirm("Repor o plano inicial? Todas as alterações e reservas registadas serão perdidas.")) setS(clone(SEED)); }}>Repor plano inicial</button>
      </footer>
      {ed && <SlotEditor s={s} date={ed.date} id={ed.id} onSave={saveSlot} onDelete={delSlot} onClose={() => setEd(null)} />}
      {bk && <BookingEditor s={s} id={bk} onSave={saveBk} onClose={() => setBk(null)} />}
    </div>
  );
}
