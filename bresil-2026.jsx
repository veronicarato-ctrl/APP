import{useState}from"react";
const G={gold:"#e0a815",ink:"#114027",cream:"#f4f7f0",red:"#b5322a",green:"#2a7d4f",blue:"#1e4976",plum:"#42286a",warm:"#5a6a52",gold2:"#a8780a"};
const SC={t:{bg:"#e8f2ff",b:"#90b8e0",c:"#1e4976",d:"#2a6fa8"},f:{bg:"#fff2e8",b:"#e0a878",c:"#7a3520",d:"#b05030"},c:{bg:"#f5f0ff",b:"#b8a0e0",c:"#42286a",d:"#6a45a0"},s:{bg:"#fff0f8",b:"#e088b8",c:"#7a1f45",d:"#b03065"},n:{bg:"#edf8ee",b:"#88c090",c:"#285c2e",d:"#3d8a46"},l:{bg:"#fdf5e8",b:"#c8a870",c:"#4a3820",d:"#7a5a38"},w:{bg:"#f5f5f5",b:"#c8c0b8",c:"#6a6060",d:"#9a9090"},x:{bg:"#f0f4f8",b:"#a8b8cc",c:"#2a3a50",d:"#4a6080"}};
const DC={r:G.red,g:G.green,b:G.blue,p:G.plum,"":`${G.gold}`};
const CC={"Fortaleza":G.gold,"→ Canoa Quebrada":G.red,"Canoa Quebrada":G.red,"→ Jericoacoara":G.blue,"Jericoacoara":G.blue,"→ Manaus":G.green,"Baixo Rio Negro":G.green,"→ Alto Rio Negro":G.plum,"Alto Rio Negro":G.plum,"→ Genève":G.gold};

const DAYS=[
{num:"Dia 1",date:"Dom 14 Dez",city:"Fortaleza",dot:"",title:"✈ Partida de Genebra",sub:"Voo noturno via Lisboa",slots:[
{time:"Tarde",end:"",type:"x",icon:"✈",label:"Genebra (GVA) → Lisboa (LIS)",detail:"TAP · escala em Lisboa · início da longa travessia"},
{time:"Noite",end:"",type:"x",icon:"✈",label:"Lisboa → Fortaleza (FOR)",detail:"TAP · voo noturno transatlântico · dormir a bordo"},
],note:"Chegada no dia 15 de manhã. Ceará está 3h atrás de Genebra no inverno europeu."},
{num:"Dia 2",date:"Seg 15 Dez",city:"Fortaleza",dot:"",title:"🌊 Chegada — descompressão",sub:"Recuperar da viagem · orla",slots:[
{time:"Manhã",end:"",type:"x",icon:"🛬",label:"Aterragem Fortaleza (FOR)",detail:"Aeroporto Pinto Martins · transfer ao hotel · deixar bagagem"},
{time:"15h",end:"16h",type:"l",icon:"🏨",label:"Check-in hotel Fortaleza",detail:"Zona da Beira-Mar (Meireles) · depositar malas assim que possível"},
{time:"17h",end:"19h",type:"n",icon:"🏖",label:"Praia do Futuro — fim de tarde",detail:"Barracas de praia · peixe fresco · primeiro contacto com o ritmo cearense"},
{time:"20h",end:"",type:"l",icon:"🏨",label:"Noite · Fortaleza",detail:"Descanso · sem programa exigente · recuperar do voo"},
],note:"Primeira noite de recuperação pura. Nada de exigente — o corpo precisa de se ajustar."},
{num:"Dia 3",date:"Ter 16 Dez",city:"→ Canoa Quebrada",dot:"r",title:"🧡 Falésias de Canoa Quebrada",sub:"Litoral leste · falésias avermelhadas",slots:[
{time:"9h",end:"12h",type:"x",icon:"🚐",label:"Transfer Fortaleza → Canoa Quebrada",detail:"~160 km · 2h30 · litoral leste · via Aracati"},
{time:"10h30",end:"11h30",type:"c",icon:"🏜",label:"Paragem Morro Branco (a caminho)",detail:"Falésias de areias coloridas · grutas · sem necessidade de dormir"},
{time:"13h",end:"14h",type:"l",icon:"🏨",label:"Check-in pousada Canoa Quebrada",detail:"Vila de pescadores · perto da Broadway · deixar malas"},
{time:"15h",end:"18h",type:"n",icon:"🚙",label:"Buggy pelas falésias",detail:"Símbolo da lua e estrela · vila dos Estevãos · Oásis (lagoa entre dunas)"},
{time:"19h",end:"21h",type:"f",icon:"🍤",label:"Jantar na Broadway",detail:"Rua principal · gastronomia local · ambiente animado"},
{time:"21h",end:"",type:"l",icon:"🏨",label:"Noite · Canoa Quebrada",detail:"Dia 1/2 em Canoa"},
],note:"Canoa é o oposto de Jeri — falésias vermelhas de 30m, vida noturna descontraída. Reservar buggy à chegada."},
{num:"Dia 4",date:"Qua 17 Dez",city:"Canoa Quebrada",dot:"r",title:"🏖 Mar e falésias sem pressa",sub:"Banho · maré baixa · descanso",slots:[
{time:"8h",end:"10h",type:"n",icon:"🌅",label:"Banho de mar de manhã",detail:"Antes do calor forte · praia de 15 km de extensão"},
{time:"10h",end:"12h",type:"n",icon:"🧡",label:"Caminhada ao pé das falésias",detail:"Maré baixa · as cores da rocha ganham profundidade"},
{time:"13h",end:"15h",type:"w",icon:"😴",label:"Descanso — pico de calor",detail:"Hora mais quente · pausa na pousada"},
{time:"16h",end:"18h",type:"n",icon:"🪂",label:"Praia livre ou kitesurf",detail:"Vento constante · opção de iniciação · ou apenas relaxar"},
{time:"19h",end:"21h",type:"f",icon:"🍹",label:"Fim de tarde e jantar",detail:"Último serão em Canoa · pôr do sol"},
{time:"21h",end:"",type:"l",icon:"🏨",label:"Noite · Canoa Quebrada",detail:"Dia 2/2 em Canoa"},
],note:"Dia deliberadamente leve. Preparar transição para Jericoacoara no dia seguinte."},
{num:"Dia 5",date:"Qui 18 Dez",city:"→ Jericoacoara",dot:"b",title:"🏜 Chegada a Jericoacoara",sub:"Voo regional · dunas · pôr do sol",slots:[
{time:"Manhã",end:"",type:"x",icon:"🚐",label:"Transfer Canoa → Fortaleza",detail:"Regresso à capital para apanhar o voo regional"},
{time:"Meio-dia",end:"",type:"x",icon:"✈",label:"Voo Fortaleza → Jericoacoara",detail:"~55 min · turboélice · evita horas de estrada"},
{time:"Tarde",end:"",type:"x",icon:"🚙",label:"Jardineira aeroporto de Cruz → vila",detail:"~30 km sobre a areia · já parte da experiência · sem carros na vila"},
{time:"16h",end:"17h",type:"l",icon:"🏨",label:"Check-in pousada Jericoacoara",detail:"Vila dentro de parque nacional · ruas de areia"},
{time:"17h30",end:"18h30",type:"s",icon:"🌇",label:"Duna do Pôr do Sol",detail:"Ritual diário · a vila sobe a duna para ver o sol cair no oceano"},
{time:"19h",end:"21h",type:"f",icon:"🍽",label:"Jantar na vila",detail:"Vila descontraída · restaurantes de rua de areia"},
{time:"21h",end:"",type:"l",icon:"🏨",label:"Noite · Jericoacoara",detail:"Dia 1/3 em Jeri"},
],note:"O voo regional resolve os 300 km de estrada. Confirmar frequência (poucos dias/semana) e reservar cedo."},
{num:"Dia 6",date:"Sex 19 Dez",city:"Jericoacoara",dot:"b",title:"💧 Lagoas cristalinas",sub:"Lagoa do Paraíso · águas permanentes",slots:[
{time:"9h",end:"10h",type:"x",icon:"🚙",label:"Trajeto ao litoral leste",detail:"Buggy ou 4x4 · rumo às lagoas do interior"},
{time:"10h",end:"15h",type:"n",icon:"💧",label:"Lagoa do Paraíso e Lagoa Azul",detail:"Águas transparentes e mornas · redes e pufes dentro de água · lagoas de lençol freático, não secam"},
{time:"13h",end:"14h",type:"f",icon:"🍤",label:"Almoço à beira da lagoa",detail:"Restaurantes flutuantes · peixe e petiscos"},
{time:"16h",end:"17h30",type:"c",icon:"🪨",label:"Pedra Furada",detail:"Arco de pedra · ícone geológico · acessível a pé na maré baixa"},
{time:"17h30",end:"18h30",type:"s",icon:"🌇",label:"Pôr do sol na duna (de novo)",detail:"O ritual repete-se sem cansar"},
{time:"20h",end:"",type:"l",icon:"🏨",label:"Noite · Jericoacoara",detail:"Dia 2/3 em Jeri"},
],note:"As lagoas de Jeri são permanentes (lençol freático) — não secam em dezembro, ao contrário dos Lençóis Maranhenses."},
{num:"Dia 7",date:"Sáb 20 Dez",city:"→ Manaus",dot:"g",title:"🛶 Litoral oeste + salto à Amazónia",sub:"Buggy oeste · voos p/ Manaus",slots:[
{time:"7h",end:"10h",type:"n",icon:"🚙",label:"Buggy litoral oeste — Tatajuba",detail:"Praias quase desertas · dunas · Mangue Seco · lagoa onde o rio encontra o mar"},
{time:"Meio-dia",end:"",type:"x",icon:"✈",label:"Voo Jericoacoara → Fortaleza",detail:"~55 min · regresso à capital"},
{time:"Tarde",end:"",type:"x",icon:"✈",label:"Voo Fortaleza → Manaus (MAO)",detail:"Direto · ~3h25 · Latam/Gol/Azul · início da 2ª semana"},
{time:"Noite",end:"",type:"l",icon:"🏨",label:"Check-in hotel Manaus",detail:"Centro histórico · perto do Teatro Amazonas"},
],note:"Dia de transição. Coordenar os dois voos com folga confortável em Fortaleza — não depender de ligação apertada."},
{num:"Dia 8",date:"Dom 21 Dez",city:"Baixo Rio Negro",dot:"g",title:"🌳 Subida ao Rio Negro",sub:"Comunidade ribeirinha · aclimatação",slots:[
{time:"Manhã",end:"",type:"c",icon:"🏛",label:"Manaus — Teatro Amazonas (se sobrar tempo)",detail:"Símbolo do ciclo da borracha · mármores e lustres europeus"},
{time:"7h",end:"9h30",type:"x",icon:"🛶",label:"Manaus → comunidade ribeirinha",detail:"Troço de estrada + lancha, ou por água desde o porto · travessia do Rio Negro"},
{time:"9h30",end:"11h",type:"l",icon:"🏡",label:"Chegada e instalação",detail:"Pousada comunitária gerida pelos moradores · receção pelos anfitriões"},
{time:"11h",end:"12h",type:"c",icon:"🚶",label:"Volta pela comunidade",detail:"A escola · a casa de farinha · primeira leitura do lugar"},
{time:"14h",end:"15h",type:"w",icon:"😴",label:"Descanso na rede",detail:"Pico de calor · a floresta abranda"},
{time:"15h30",end:"17h30",type:"n",icon:"🌿",label:"Primeira trilha na mata",detail:"Guia morador · árvores e plantas medicinais · andar lento"},
{time:"19h30",end:"21h",type:"n",icon:"🐊",label:"Focagem noturna de jacarés",detail:"De canoa · olhos a brilhar na lanterna · sons da noite"},
{time:"21h",end:"",type:"l",icon:"🏡",label:"Noite · comunidade",detail:"Dia 1/2 no baixo rio"},
],note:"Dia de aclimatação deliberada — o corpo habitua-se ao calor e à humidade. Só para os 2 adultos."},
{num:"Dia 9",date:"Seg 22 Dez",city:"Baixo Rio Negro",dot:"g",title:"🐬 Anavilhanas e os Tatuyo",sub:"Arquipélago · botos · aldeia",slots:[
{time:"6h",end:"7h30",type:"n",icon:"🛶",label:"Amanhecer de canoa nos igarapés",detail:"Melhor hora para aves · mata alagada de dezembro · remar entre as árvores"},
{time:"8h30",end:"12h",type:"n",icon:"🏝",label:"Navegação em Anavilhanas",detail:"2º maior arquipélago fluvial do mundo · banho · observação de botos"},
{time:"14h30",end:"17h",type:"c",icon:"🪶",label:"Aldeia indígena dos Tatuyo",detail:"Cultura · cantos · pinturas · roda de conversa · desenhado pela própria aldeia"},
{time:"19h30",end:"21h",type:"c",icon:"🔥",label:"Serão de histórias",detail:"Com as famílias anfitriãs · o coração da experiência comunitária"},
{time:"21h",end:"",type:"l",icon:"🏡",label:"Noite · comunidade",detail:"Dia 2/2 no baixo rio"},
],note:"Fim do tempo do baixo rio. Preparar bagagem leve para São Gabriel · confirmar o voo do dia seguinte."},
{num:"Dia 10",date:"Ter 23 Dez",city:"→ Alto Rio Negro",dot:"p",title:"🚤 Salto ao alto Rio Negro",sub:"São Gabriel da Cachoeira · FOIRN",slots:[
{time:"6h",end:"6h30",type:"x",icon:"✈",label:"Voo Manaus → São Gabriel da Cachoeira",detail:"⚠️ Ponto fixo · ~1h30 · Azul · SÓ 2-3x/semana · reservar cedo"},
{time:"8h",end:"9h",type:"c",icon:"🏔",label:"Chegada a São Gabriel",detail:"A cidade mais indígena do Brasil · 23 etnias · Pico da Neblina ao longe"},
{time:"9h30",end:"11h",type:"c",icon:"🤝",label:"Encontro na FOIRN",detail:"Federação das Organizações Indígenas do Rio Negro · alinhamento e autorizações"},
{time:"11h",end:"14h",type:"x",icon:"🚤",label:"Voadeira rio acima até à aldeia",detail:"Já parte da experiência · as margens fecham-se · pode ser longa"},
{time:"14h",end:"16h",type:"l",icon:"🏡",label:"Receção pela comunidade",detail:"Apresentação às lideranças · instalação simples · ser recebido, não visitar"},
{time:"19h",end:"21h",type:"f",icon:"🍲",label:"Jantar partilhado",detail:"Comida do território · primeira noite no ritmo da aldeia"},
{time:"21h",end:"",type:"l",icon:"🏡",label:"Noite · aldeia",detail:"Dia 1/2 no alto rio"},
],note:"⚠️ Voo em dia certo da semana — organizar o dia à volta do horário real. Autorização FUNAI/FOIRN com antecedência."},
{num:"Dia 11",date:"Qua 24 Dez",city:"Alto Rio Negro",dot:"p",title:"🌌 O dia mais fundo · Natal",sub:"Cosmovisão · eventual ritual",slots:[
{time:"Amanhecer",end:"",type:"c",icon:"🌄",label:"Acordar com a aldeia",detail:"Sem despertador · ao som do rio · pequeno-almoço com a comunidade"},
{time:"8h",end:"11h",type:"c",icon:"🎣",label:"Quotidiano por dentro",detail:"Conforme o que a comunidade partilhe · pesca · roça · farinha · aprender fazendo"},
{time:"11h",end:"12h",type:"c",icon:"🗣",label:"Roda de conversa com os mais velhos",detail:"Com mediação · a relação com a floresta · a cosmovisão"},
{time:"15h",end:"17h",type:"n",icon:"🌊",label:"Atividade no rio ou na mata",detail:"Conforme o convite · um igarapé · um lugar de significado"},
{time:"Noite",end:"",type:"s",icon:"🌌",label:"Dimensão ritual — se e como fizer sentido",detail:"Por via tradicional · conduzida por quem de direito · triagem de saúde e dieta prévias · NUNCA serviço avulso",desc:"Com todo o rigor já estabelecido. Se houver o acolhimento de uma cerimónia por via tradicional, é numa noite como esta que se integra, precedida da triagem de saúde e da dieta que a seriedade exige. Não é um número do programa, é algo que só acontece se a relação e as condições o permitirem. Sendo noite de Natal, poderá simplesmente ser uma noite de convívio sereno, e estará bem assim.",tips:["A ayahuasca é legal no Brasil só em contexto ritual religioso (Resolução 1/2010 CONAD)","A exploração turística e comercial da bebida é vetada por lei","Triagem de saúde indispensável — interação perigosa com antidepressivos e contraindicações cardíacas/psíquicas"]},
{time:"21h",end:"",type:"l",icon:"🏡",label:"Noite · aldeia",detail:"Dia 2/2 no alto rio · Natal na floresta"},
],note:"O centro de gravidade da semana. Se um único dia correr como deve, que seja este. Mente aberta, agenda vazia."},
{num:"Dia 12",date:"Qui 25 Dez",city:"→ Manaus",dot:"g",title:"🚤 Regresso faseado",sub:"Voadeira · voo a Manaus",slots:[
{time:"Amanhecer",end:"",type:"c",icon:"🎁",label:"Última manhã na aldeia",detail:"Despedida · agradecimentos · artesanato direto que sustenta a comunidade"},
{time:"8h",end:"12h",type:"x",icon:"🚤",label:"Voadeira de regresso a São Gabriel",detail:"Com margem de segurança larga para o voo"},
{time:"Tarde",end:"",type:"x",icon:"✈",label:"Voo São Gabriel → Manaus",detail:"⚠️ Ponto fixo · dia certo · o primeiro duche urbano em dias"},
{time:"Noite",end:"",type:"f",icon:"🍽",label:"Jantar de encerramento em Manaus",detail:"Balanço da travessia · do conforto ribeirinho ao coração do território"},
{time:"Noite",end:"",type:"l",icon:"🏨",label:"Noite · Manaus",detail:"Reconfirmar o voo internacional do dia seguinte"},
],note:"O Natal passou-se entre a floresta e o rio. Voo São Gabriel→Manaus em dia certo — calcular com margem."},
{num:"Dia 13",date:"Sex 26 Dez",city:"→ Genève",dot:"",title:"✈ Retorno à Europa",sub:"Manaus → Genebra via Lisboa",slots:[
{time:"Manhã",end:"",type:"n",icon:"🚶",label:"Última passagem pela beira-rio",detail:"Conforme o horário do voo · fechar o círculo onde começou"},
{time:"A confirmar",end:"",type:"x",icon:"✈",label:"Voo Manaus → Lisboa",detail:"TAP · voo transatlântico · prever margem confortável"},
{time:"A confirmar",end:"",type:"x",icon:"✈",label:"Lisboa → Genebra (GVA)",detail:"Chegada a Genebra · fim da viagem"},
],note:"A frequência dos voos transatlânticos de Manaus é menor do que a de Fortaleza — reconfirmar horários na reserva."},
];

const HOTELS=[
{nuits:"1",dates:"15–16 Dez",city:"Fortaleza",icon:"🏨",type:"Hotel Beira-Mar (Meireles)",color:G.gold,nights:1,budget:"A reservar",status:"🔴 A reservar",reservation:"Zona da Beira-Mar · Meireles · perto do aeroporto",note:"Noite de chegada e descompressão. Conforto médio — só para dormir e recuperar do voo."},
{nuits:"2–3",dates:"16–18 Dez",city:"Canoa Quebrada",icon:"🧡",type:"Pousada de charme",color:G.red,nights:2,budget:"A reservar",status:"🔴 A reservar",reservation:"Vila de Canoa Quebrada · perto da Broadway · Aracati",note:"2 noites · falésias e litoral leste. Reservar cedo — dezembro é alta temporada."},
{nuits:"4–6",dates:"18–20 Dez",city:"Jericoacoara",icon:"🏜",type:"Pousada na vila (parque nacional)",color:G.blue,nights:3,budget:"A reservar",status:"🔴 A reservar",reservation:"Dentro da vila · ruas de areia · sem carros",note:"3 noites · clímax da parte de praia. Reservar com muita antecedência (Réveillon aproxima-se)."},
{nuits:"7",dates:"20–21 Dez",city:"Manaus",icon:"🏨",type:"Hotel centro histórico",color:G.green,nights:1,budget:"A reservar",status:"🔴 A reservar",reservation:"Centro histórico · perto do Teatro Amazonas",note:"Noite de chegada à Amazónia + guardar bagagem que não sobe ao rio."},
{nuits:"8–9",dates:"21–23 Dez",city:"Baixo Rio Negro",icon:"🏡",type:"Pousada comunitária",color:G.green,nights:2,budget:"Via operador",status:"🟠 Via Poranduba",reservation:"Comunidade ribeirinha (Tumbira/Santa Helena) · gerida pelos moradores",note:"Dormir DENTRO da comunidade, não de visita. Reservado via operador de base comunitária."},
{nuits:"10–11",dates:"23–25 Dez",city:"Alto Rio Negro",icon:"🏡",type:"Aldeia (alojamento simples)",color:G.plum,nights:2,budget:"Via FOIRN",status:"⚠️ Autorização FUNAI",reservation:"Aldeia no território · mediação FOIRN · São Gabriel da Cachoeira",note:"Depende de autorização e do consentimento da comunidade. Tratar com muita antecedência."},
{nuits:"12",dates:"25–26 Dez",city:"Manaus",icon:"🏨",type:"Hotel centro (regresso)",color:G.green,nights:1,budget:"A reservar",status:"🔴 A reservar",reservation:"Manaus · última noite antes do voo internacional",note:"Noite de encerramento. Reconfirmar voo internacional do dia 26."},
];

const TRAINS=[
{j:"1",trajet:"Genebra → Fortaleza",type:"Voo internacional",svc:"TAP · via Lisboa",dur:"~13h",pass:"Bilhete ✈",note:"Voo noturno · entrada por Fortaleza"},
{j:"3",trajet:"Fortaleza → Canoa Quebrada",type:"Transfer rodoviário",svc:"Van/carro · via Aracati",dur:"2h30",pass:"Transfer 🚐",note:"~160 km · litoral leste · paragem em Morro Branco"},
{j:"5",trajet:"Canoa → Fortaleza → Jeri",type:"Transfer + voo regional",svc:"VoePass (FOR→JJD)",dur:"~55 min voo",pass:"Bilhete ✈",note:"Voo evita 300 km de estrada · poucos dias/semana"},
{j:"7",trajet:"Jericoacoara → Fortaleza",type:"Voo regional",svc:"VoePass",dur:"~55 min",pass:"Bilhete ✈",note:"Regresso à capital para ligação a Manaus"},
{j:"7",trajet:"Fortaleza → Manaus",type:"Voo doméstico",svc:"Latam/Gol/Azul",dur:"~3h25",pass:"Bilhete ✈",note:"Direto · eixo que liga as duas metades"},
{j:"8",trajet:"Manaus → Baixo Rio Negro",type:"Lancha / estrada",svc:"Via operador",dur:"~2h30",pass:"Operador 🛶",note:"Estrada + lancha ou por água desde o porto"},
{j:"10",trajet:"Manaus → São Gabriel",type:"Voo doméstico",svc:"Azul",dur:"~1h30",pass:"Bilhete ✈",note:"⚠️ SÓ 2-3x/semana · amarra o calendário"},
{j:"10",trajet:"São Gabriel → aldeia",type:"Voadeira (barco rápido)",svc:"Via FOIRN",dur:"6–12h possível",pass:"Autorização ⚠️",note:"Autorização FUNAI · pode ser muito longa"},
{j:"13",trajet:"Manaus → Genebra",type:"Voo internacional",svc:"TAP · via Lisboa",dur:"~13h",pass:"Bilhete ✈",note:"Saída por Manaus · frequência menor que Fortaleza"},
];

function DayCard({d}){
  const[openSlot,setOpenSlot]=useState(null);
  const dc=DC[d.dot]||G.gold, cc=CC[d.city]||G.gold;
  return(
    <div style={{background:"#fff",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,overflow:"hidden",borderTop:`3px solid ${dc}`}}>
      <div style={{padding:"12px 16px 10px",borderBottom:"0.5px solid rgba(0,0,0,0.07)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
          <span style={{fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:G.gold2}}>{d.num} · {d.date}</span>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 9px",borderRadius:100,background:`${cc}18`,color:cc,border:`0.5px solid ${cc}40`,whiteSpace:"nowrap"}}>{d.city}</span>
        </div>
        <p style={{fontSize:15,fontWeight:600,margin:"0 0 2px",color:G.ink}}>{d.title}</p>
        <p style={{fontSize:11.5,color:G.warm,margin:0,fontStyle:"italic"}}>{d.sub}</p>
      </div>
      <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:4}}>
        {d.slots.map((s,i)=>{
          const sc=SC[s.type]||SC.x;
          const isOpen=openSlot===i;
          return(
            <div key={i}>
              <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                <div style={{width:60,flexShrink:0,textAlign:"right",paddingTop:5}}>
                  <span style={{fontSize:10.5,fontWeight:600,color:"#8a7a68"}}>{s.time}</span>
                </div>
                <div style={{width:16,flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:6}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:sc.d,flexShrink:0}}/>
                  {i<d.slots.length-1&&<div style={{width:1.5,flex:1,minHeight:10,background:`${sc.d}40`,marginTop:2}}/>}
                </div>
                <div
                  onClick={()=>s.desc?setOpenSlot(isOpen?null:i):null}
                  style={{flex:1,background:isOpen?sc.bg:"transparent",border:`0.5px solid ${isOpen?sc.b:"transparent"}`,borderRadius:7,padding:"5px 9px",marginBottom:1,cursor:s.desc?"pointer":"default",transition:"all .2s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontSize:13}}>{s.icon}</span>
                    <span style={{fontSize:12,fontWeight:500,color:sc.c,flex:1}}>{s.label}</span>
                    {s.end&&<span style={{fontSize:9.5,color:"#9a8a78",flexShrink:0}}>→{s.end}</span>}
                    {s.desc&&<span style={{fontSize:10,color:sc.d,flexShrink:0}}>{isOpen?"▲":"▼"}</span>}
                  </div>
                  {s.detail&&<p style={{fontSize:11,color:"#7a6a58",margin:"2px 0 0",lineHeight:1.4}}>{s.detail}</p>}
                </div>
              </div>
              {isOpen&&s.desc&&(
                <div style={{marginLeft:84,marginTop:2,marginBottom:4,background:sc.bg,border:`0.5px solid ${sc.b}`,borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${sc.d}`}}>
                  <p style={{fontSize:12,color:"#3a2a18",lineHeight:1.65,margin:"0 0 6px"}}>{s.desc}</p>
                  {s.tips&&s.tips.map((t,j)=>(
                    <div key={j} style={{display:"flex",gap:6,marginTop:4}}>
                      <span style={{color:sc.d,flexShrink:0,fontSize:11}}>→</span>
                      <span style={{fontSize:11,color:"#6a5a48",lineHeight:1.5}}>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {d.note&&<div style={{margin:"0 14px 12px",padding:"7px 10px",background:"rgba(200,144,42,0.07)",borderLeft:`2px solid ${G.gold}`,fontSize:11.5,color:"#6a5030",lineHeight:1.5}}>{d.note}</div>}
    </div>
  );
}

function RoutePanel(){
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Visão geral</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>13 dias · 2 semanas</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>Chegada Fortaleza 15 Dez · saída Manaus 26 Dez · Ceará (praia) + Amazónia (imersão) · 2 adultos</p>
      </div>
      <div style={{background:"#114027",borderRadius:12,padding:"14px 18px",marginBottom:18,color:"#eafff2"}}>
        <p style={{fontSize:13,fontWeight:500,color:"#e0a815",margin:"0 0 10px"}}>☀️ Dezembro · duas estações opostas</p>
        <div style={{display:"flex",marginBottom:8}}>
          {[["30–32°","Ceará seco"],["Sol","Litoral"],["🌧","Amazónia"],["Águas","altas"]].map(([v,l])=>(
            <div key={l} style={{flex:1,textAlign:"center",padding:"3px 6px",borderRight:"0.5px solid rgba(255,255,255,0.1)"}}>
              <div style={{fontSize:16,fontWeight:500,color:"#fff"}}>{v}</div>
              <div style={{fontSize:9,letterSpacing:"1px",textTransform:"uppercase",color:"rgba(255,255,255,0.4)"}}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{fontSize:11.5,color:"rgba(200,230,205,0.75)",borderTop:"0.5px solid rgba(255,255,255,0.08)",paddingTop:8,margin:0}}>Ceará ensolarado enquanto a Amazónia enche os rios — as águas altas permitem navegar a floresta alagada</p>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:16}}>
        {[["x","✈ Transporte"],["f","🍜 Comida"],["c","🎎 Cultura"],["s","🌌 Ritual/Show"],["n","🌿 Natureza"],["l","🏡 Alojamento"],["w","😴 Descanso"]].map(([t,label])=>{
          const sc=SC[t];
          return <span key={t} style={{fontSize:10.5,padding:"3px 10px",borderRadius:100,background:sc.bg,color:sc.c,border:`0.5px solid ${sc.b}`}}>{label}</span>;
        })}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"0 0 14px"}}>
        <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.1)"}}/>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.blue,whiteSpace:"nowrap",padding:"4px 12px",background:"rgba(30,73,118,0.07)",borderRadius:100}}>Semana 1 · Ceará (praia)</span>
        <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.1)"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {DAYS.slice(0,7).map((d,i)=><DayCard key={i} d={d}/>)}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0 14px"}}>
        <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.1)"}}/>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.green,whiteSpace:"nowrap",padding:"4px 12px",background:"rgba(61,97,66,0.09)",borderRadius:100}}>Semana 2 · Amazónia (imersão)</span>
        <div style={{flex:1,height:"0.5px",background:"rgba(0,0,0,0.1)"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {DAYS.slice(7).map((d,i)=><DayCard key={i} d={d}/>)}
      </div>
    </div>
  );
}

function HotelsPanel(){
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Planificação</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>Alojamentos</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>7 estadias · 12 noites · do hotel de praia à pousada comunitária e à aldeia</p>
      </div>
      <div style={{background:G.ink,borderRadius:12,padding:"16px 20px",marginBottom:22}}>
        <p style={{fontSize:13,fontWeight:500,color:"#e8c870",margin:"0 0 12px"}}>Vista de conjunto — 12 noites</p>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr>{["Noites","Datas","Local","Tipo","N"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",fontSize:9.5,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(255,255,255,0.4)",borderBottom:"0.5px solid rgba(255,255,255,0.1)"}}>{h}</th>)}</tr></thead>
          <tbody>
            {HOTELS.map((h,i)=>(
              <tr key={i} style={{borderBottom:"0.5px solid rgba(255,255,255,0.06)"}}>
                <td style={{padding:"8px 10px",color:G.gold,fontWeight:600}}>{h.nuits}</td>
                <td style={{padding:"8px 10px",color:"rgba(255,255,255,0.5)",fontSize:11}}>{h.dates}</td>
                <td style={{padding:"8px 10px",color:h.color,fontWeight:500}}>{h.icon} {h.city}</td>
                <td style={{padding:"8px 10px",color:"rgba(255,255,255,0.8)"}}>{h.type}</td>
                <td style={{padding:"8px 10px",textAlign:"center"}}><span style={{background:`${h.color}30`,color:h.color,padding:"2px 8px",borderRadius:100,fontSize:11,fontWeight:600}}>{h.nights}n</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {HOTELS.map((h,i)=>(
          <div key={i} style={{background:"#fff",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,overflow:"hidden",borderTop:`3px solid ${h.color}`}}>
            <div style={{padding:"14px 16px 10px",borderBottom:"0.5px solid rgba(0,0,0,0.07)"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:26}}>{h.icon}</span>
                  <div>
                    <p style={{fontSize:10,fontWeight:600,letterSpacing:2,textTransform:"uppercase",color:h.color,margin:"0 0 2px"}}>{h.city} · {h.dates}</p>
                    <p style={{fontSize:15,fontWeight:600,margin:0}}>{h.type}</p>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:100,background:h.status.includes("🔴")?G.red:h.status.includes("⚠️")?G.plum:G.gold,color:"#fff"}}>{h.status}</span>
                  <span style={{fontSize:12,color:h.color,fontWeight:500}}>{h.budget} · {h.nights}n</span>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 16px",display:"grid",gap:8}}>
              <div style={{background:"rgba(200,144,42,0.07)",borderLeft:`2px solid ${G.gold}`,padding:"7px 10px",fontSize:12,color:"#6a5030",lineHeight:1.5}}><strong>Onde:</strong> {h.reservation}</div>
              <div style={{background:"rgba(0,0,0,0.03)",borderRadius:8,padding:"7px 10px",fontSize:12,color:G.warm,lineHeight:1.5}}>ℹ️ {h.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransportPanel(){
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:22}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Mobilidade</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>Transportes</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>Voos, transfers, lancha e voadeira — do litoral à floresta profunda.</p>
      </div>
      <div style={{background:"rgba(181,50,42,0.07)",borderLeft:`3px solid ${G.red}`,padding:"12px 14px",borderRadius:8,marginBottom:20,fontSize:12.5,color:"#6a2a20",lineHeight:1.6}}>
        <strong>⚠️ Ponto crítico do calendário:</strong> o voo Manaus → São Gabriel da Cachoeira opera só 2–3x por semana. Os dias de entrada e saída do alto Rio Negro ficam amarrados a estes voos — reservar cedo, sem improviso.
      </div>
      <div style={{background:G.ink,borderRadius:12,overflow:"hidden",marginBottom:24}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Dia","Trajeto","Serviço","Duração","Modo","Nota"].map(h=><th key={h} style={{textAlign:"left",padding:"9px 12px",fontSize:9.5,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",color:"rgba(255,255,255,0.4)",borderBottom:"0.5px solid rgba(255,255,255,0.1)",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>
              {TRAINS.map((r,i)=>(
                <tr key={i} style={{borderBottom:"0.5px solid rgba(255,255,255,0.06)"}}>
                  <td style={{padding:"8px 12px",color:G.gold,fontWeight:600,whiteSpace:"nowrap"}}>D{r.j}</td>
                  <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.85)",fontWeight:500}}>{r.trajet}</td>
                  <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{r.svc}</td>
                  <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap"}}>{r.dur}</td>
                  <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}><span style={{fontSize:11,padding:"2px 8px",borderRadius:100,background:r.pass.includes("⚠️")?"rgba(122,31,105,0.4)":"rgba(42,63,92,0.4)",color:r.pass.includes("⚠️")?"#e088b8":"#90b8e0"}}>{r.pass}</span></td>
                  <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.4)",fontSize:11}}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:G.gold2,margin:"0 0 10px"}}>Apps e documentos úteis</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {[
          {icon:"🗺",name:"Google Maps",use:"Navegação · offline no Ceará · inútil na floresta profunda",tip:"Descarregar mapas offline antes"},
          {icon:"✈",name:"Latam / Gol / Azul",use:"Voos domésticos · check-in · alterações",tip:"Azul opera o voo de São Gabriel"},
          {icon:"📱",name:"eSIM (Airalo)",use:"Dados no Ceará e Manaus · sem sinal na selva",tip:"Ativar antes de aterrar"},
          {icon:"💉",name:"Febre amarela",use:"Vacina recomendada para a Amazónia",tip:"Centro de medicina do viajante 6-8 sem. antes"},
          {icon:"🛂",name:"Passaporte UE",use:"Sem visto para turismo curto no Brasil",tip:"Confirmar validade e regras à data"},
        ].map((a,i)=>(
          <div key={i} style={{background:"#fff",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontSize:20}}>{a.icon}</span>
              <p style={{fontSize:13,fontWeight:600,margin:0}}>{a.name}</p>
            </div>
            <p style={{fontSize:12,color:"#5a4a38",margin:"0 0 5px",lineHeight:1.5}}>{a.use}</p>
            <p style={{fontSize:11.5,color:G.warm,fontStyle:"italic",margin:0,background:"rgba(200,144,42,0.06)",padding:"4px 8px",borderRadius:6,lineHeight:1.4}}>💡 {a.tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReserverPanel(){
  const[done,setDone]=useState({});
  const toggle=k=>setDone(d=>({...d,[k]:!d[k]}));
  const sections=[
    {title:"🔴 Urgente — reservar já",bg:"#0d3d24",bc:"#e86a5a",items:[
      {k:"voos_intl",label:"✈ Voos internacionais TAP (GVA→FOR / MAO→GVA)",date:"Quanto antes",desc:"Entrar por Fortaleza e sair por Manaus, via Lisboa, para não refazer trajetos. Preços sobem em dezembro."},
      {k:"voo_jeri",label:"✈ Voo regional Fortaleza ↔ Jericoacoara",date:"Poucos dias/semana",desc:"VoePass · ~55 min · substitui os 300 km de estrada. Frequência limitada — reservar cedo."},
      {k:"voo_mao",label:"✈ Voo Fortaleza → Manaus",date:"Reservar cedo",desc:"Direto · ~3h25 · Latam/Gol/Azul. Coordenar com o voo de Jeri no dia 20 com folga."},
      {k:"voo_sgc",label:"✈ Voo Manaus → São Gabriel da Cachoeira",date:"CRÍTICO · 2-3x/semana",desc:"Azul · ~1h30. Este voo amarra todo o calendário da 2ª semana. Verificar dias exatos antes de fixar tudo."},
      {k:"pousada_jeri",label:"🏜 Pousada Jericoacoara (3 noites)",date:"Alta temporada",desc:"Réveillon aproxima-se — a procura dispara. Reservar com muita antecedência."},
    ]},
    {title:"🟠 Contactar operadores e mediadores",bg:"#114027",bc:"#e8c050",items:[
      {k:"poranduba",label:"🌳 Poranduba Amazónia (baixo Rio Negro)",date:"Contactar já",desc:"Operadora de base comunitária nascida no Tumbira. Pedir roteiro imersivo 21-22 Dez e ajuda para o alto rio. Texto pronto no documento de contactos.",links:[{l:"Redes / site oficial",u:"https://www.google.com/search?q=poranduba+amazonia"}]},
      {k:"foirn",label:"🤝 FOIRN — Federação Indígena do Rio Negro",date:"Com antecedência",desc:"Interlocutor legítimo do alto Rio Negro (não é agência). Pedido de orientação respeitoso, não uma reserva. Autorizações levam tempo.",links:[{l:"São Gabriel da Cachoeira",u:"https://www.google.com/search?q=FOIRN+rio+negro"}]},
      {k:"funai",label:"⚠️ Autorização FUNAI (terras indígenas)",date:"Meses antes",desc:"A visita a aldeias do alto Rio Negro exige autorização tratada com muita antecedência, via FOIRN."},
      {k:"canoa",label:"🧡 Pousada Canoa Quebrada (2 noites)",date:"Reservar cedo",desc:"Vila perto da Broadway. Buggy pelas falésias a combinar à chegada."},
    ]},
    {title:"🟡 Antes de partir",bg:"#0a3320",bc:"#7fd0a0",items:[
      {k:"fortaleza",label:"🏨 Hotel Fortaleza (chegada + regresso)",date:"Antes de partir",desc:"Uma noite à chegada (dia 15). Zona da Beira-Mar. Mais a noite de encerramento em Manaus (dia 25)."},
      {k:"manaus",label:"🏨 Hotel Manaus (2 noites separadas)",date:"Antes de partir",desc:"Centro histórico. Guardar a bagagem que não sobe ao rio."},
      {k:"febre",label:"💉 Vacina febre amarela + medicina do viajante",date:"6-8 semanas antes",desc:"Recomendada para a Amazónia. Consultar sobre malária e outras precauções."},
      {k:"triagem",label:"🌌 Triagem de saúde (se via ritual)",date:"Se aplicável",desc:"Indispensável antes de qualquer cerimónia — interação perigosa com antidepressivos, contraindicações cardíacas e psíquicas."},
      {k:"esim",label:"📱 eSIM + seguro de viagem",date:"Antes de partir",desc:"Dados para Ceará e Manaus. Seguro com repatriamento médico e cobertura Amazónia."},
    ]},
  ];
  const total=sections.flatMap(s=>s.items).length;
  const doneCnt=Object.values(done).filter(Boolean).length;
  const pct=Math.round(doneCnt/total*100);
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Planificação</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>A reservar</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>Clica em cada item para o marcar como feito.</p>
      </div>
      <div style={{background:"#f0ece4",borderRadius:12,padding:"14px 16px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:G.ink}}>{doneCnt} / {total} tratados</span>
          <span style={{fontSize:13,fontWeight:700,color:pct===100?G.green:G.gold}}>{pct}%</span>
        </div>
        <div style={{background:"rgba(0,0,0,0.08)",borderRadius:100,height:8,overflow:"hidden"}}>
          <div style={{width:`${pct}%`,height:"100%",background:pct===100?G.green:G.gold,borderRadius:100,transition:"width .4s ease"}}/>
        </div>
      </div>
      {sections.map((sec,si)=>(
        <div key={si} style={{background:sec.bg,borderRadius:12,padding:"16px 18px",marginBottom:14}}>
          <p style={{fontSize:13,fontWeight:600,color:sec.bc,margin:"0 0 12px",borderBottom:`0.5px solid ${sec.bc}40`,paddingBottom:8}}>{sec.title}</p>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sec.items.map((item,ii)=>{
              const isDone=done[item.k];
              return(
                <div key={ii} style={{background:isDone?"rgba(61,97,66,0.15)":"rgba(255,255,255,0.05)",border:`0.5px solid ${isDone?G.green+"60":"rgba(255,255,255,0.1)"}`,borderRadius:10,padding:"12px 14px",cursor:"pointer",transition:"all .2s"}}
                  onClick={()=>toggle(item.k)}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${isDone?G.green:sec.bc}`,background:isDone?G.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1,transition:"all .2s"}}>
                      {isDone&&<span style={{fontSize:12,color:"#fff",fontWeight:700}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,fontWeight:600,color:isDone?"rgba(255,255,255,0.45)":"#fff",margin:"0 0 2px",textDecoration:isDone?"line-through":"none"}}>{item.label}</p>
                      <p style={{fontSize:11,color:isDone?"rgba(255,255,255,0.3)":sec.bc,margin:"0 0 4px",fontWeight:600}}>{item.date}</p>
                      {!isDone&&<p style={{fontSize:11.5,color:"rgba(205,232,212,0.72)",margin:"0 0 8px",lineHeight:1.55}}>{item.desc}</p>}
                      {!isDone&&item.links&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {item.links.map((lk,li)=>(
                          <a key={li} href={lk.u} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}
                            style={{fontSize:11,padding:"3px 10px",borderRadius:100,background:`${sec.bc}25`,color:sec.bc,border:`0.5px solid ${sec.bc}50`,textDecoration:"none",fontWeight:500}}>→ {lk.l}</a>
                        ))}
                      </div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactPanel(){
  const[copied,setCopied]=useState(null);
  const msgs=[
    {k:"por",color:G.green,title:"Poranduba Amazónia",sub:"Operadora de base comunitária · baixo Rio Negro",badge:"Pedir um serviço",
     body:`Assunto: Roteiro imersivo no Rio Negro para dois adultos, 20 a 26 de dezembro

Bom dia,

Chamo-me [nome] e viajo com [nome], dois adultos vindos da Suíça, com uma semana disponível na Amazónia entre 20 e 26 de dezembro de 2026.

Procuramos uma experiência de imersão verdadeira e não um passeio turístico, com contacto genuíno com as comunidades do rio, tempo passado dentro de uma comunidade e não apenas de visita, e disposição para esforço físico.

Interessa-nos muito o vosso roteiro no baixo Rio Negro, com Anavilhanas, a vida na comunidade e o encontro com a aldeia Tatuyo, e gostaríamos de saber se é possível, na sequência, avançar para o alto Rio Negro, na região de São Gabriel da Cachoeira, para um contacto mais profundo, e se nos podem ajudar com essa logística ou indicar quem o faça.

Poderiam dizer-nos a disponibilidade nessas datas, o roteiro que sugerem, o que inclui, o valor por pessoa e o que devemos reservar já, tendo em conta que dezembro é época alta.

Uma última questão, colocada com todo o respeito. Temos interesse sincero em conhecer, se for adequado e por via tradicional, práticas rituais das comunidades. Compreendemos que isto não é um serviço turístico e que depende inteiramente das comunidades, pelo que apenas gostaríamos de saber se faz sentido sequer conversar sobre o assunto.

Ficamos muito gratos pela vossa atenção.

Com os melhores cumprimentos,
[nome e contacto]`},
    {k:"foi",color:G.plum,title:"FOIRN",sub:"Federação das Organizações Indígenas do Rio Negro · alto rio",badge:"Pedir orientação, não reserva",
     body:`Assunto: Pedido de orientação para uma visita respeitosa ao alto Rio Negro

Prezados,

Dirijo-me à FOIRN com um pedido de orientação, reconhecendo desde já que o território do alto Rio Negro pertence aos seus povos e que a visita depende inteiramente da vontade das comunidades.

Somos dois adultos vindos da Suíça e teremos alguns dias na região de São Gabriel da Cachoeira em finais de dezembro de 2026. O nosso desejo é conhecer com respeito e profundidade a vida e a cultura dos povos do Rio Negro, longe de qualquer lógica de turismo apressado, dispostos a escutar, a aprender e a contribuir de forma justa para as comunidades que nos recebam.

Gostaríamos de saber se existe uma forma adequada de uma visita deste género, que organizações ou comunidades poderão estar abertas a receber-nos, que autorizações são necessárias e com que antecedência as devemos tratar, e de que modo podemos garantir que a nossa presença seja benéfica e nunca intrusiva.

Compreendemos que a resposta possa levar tempo e que possa ser negativa, e aceitamos isso com inteiro respeito.

Com o maior respeito e consideração,
[nome e contacto]`},
  ];
  const copy=(k,t)=>{navigator.clipboard&&navigator.clipboard.writeText(t);setCopied(k);setTimeout(()=>setCopied(null),1600);};
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Contactos</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>Mensagens prontas</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>Dois interlocutores muito diferentes. Ajustar nomes e datas antes de enviar.</p>
      </div>
      <div style={{background:"rgba(66,40,106,0.06)",borderLeft:`3px solid ${G.plum}`,padding:"12px 14px",borderRadius:8,marginBottom:20,fontSize:12.5,color:"#3a2a50",lineHeight:1.6}}>
        <strong>Porquê dois tons?</strong> A Poranduba é uma agência — pede-se um serviço. A FOIRN é uma organização política dos povos indígenas — pede-se orientação respeitosa. Em nenhuma se pede diretamente uma cerimónia ritual: a via séria não se compra, oferece-se dentro de uma relação.
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {msgs.map(m=>(
          <div key={m.k} style={{background:"#fff",border:"0.5px solid rgba(0,0,0,0.1)",borderRadius:14,overflow:"hidden",borderTop:`3px solid ${m.color}`}}>
            <div style={{padding:"14px 16px 10px",borderBottom:"0.5px solid rgba(0,0,0,0.07)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap"}}>
              <div>
                <p style={{fontSize:16,fontWeight:600,margin:"0 0 2px",color:m.color}}>{m.title}</p>
                <p style={{fontSize:11.5,color:G.warm,margin:0}}>{m.sub}</p>
              </div>
              <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:100,background:`${m.color}18`,color:m.color,border:`0.5px solid ${m.color}40`,whiteSpace:"nowrap"}}>{m.badge}</span>
            </div>
            <div style={{padding:"12px 16px"}}>
              <pre style={{fontFamily:"system-ui,sans-serif",fontSize:12,color:"#3a2a18",lineHeight:1.6,whiteSpace:"pre-wrap",margin:0,background:"rgba(0,0,0,0.02)",padding:"12px 14px",borderRadius:8,borderLeft:`3px solid ${m.color}`}}>{m.body}</pre>
              <button onClick={()=>copy(m.k,m.body)} style={{marginTop:10,fontSize:12,fontWeight:600,padding:"7px 16px",borderRadius:100,background:copied===m.k?G.green:m.color,color:"#fff",border:"none",cursor:"pointer",transition:"background .2s"}}>{copied===m.k?"✓ Copiado":"📋 Copiar mensagem"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartePanel(){
  const stops=[
    {n:1,city:"Fortaleza",days:"D2",dates:"15 Dez",sx:74,sy:33,color:G.gold,items:["✈ Chegada via Lisboa","Praia do Futuro","Hub dos voos internos"]},
    {n:2,city:"Canoa Quebrada",days:"D3–D4",dates:"16–17 Dez",sx:76,sy:36,color:G.red,items:["Falésias avermelhadas","Buggy · Oásis","Broadway"]},
    {n:3,city:"Jericoacoara",days:"D5–D7",dates:"18–20 Dez",sx:70,sy:31,color:G.blue,items:["Dunas móveis","Lagoa do Paraíso","Pedra Furada","Pôr do sol na duna"]},
    {n:4,city:"Manaus",days:"D7–D8",dates:"20–21 Dez",sx:40,sy:34,color:G.green,items:["Teatro Amazonas","Porta da Amazónia","Base logística"]},
    {n:5,city:"Baixo Rio Negro",days:"D8–D9",dates:"21–22 Dez",sx:36,sy:33,color:G.green,items:["Comunidade ribeirinha","Anavilhanas · botos","Aldeia Tatuyo"]},
    {n:6,city:"Alto Rio Negro",days:"D10–D12",dates:"23–25 Dez",sx:24,sy:30,color:G.plum,items:["São Gabriel da Cachoeira","23 etnias · FOIRN","Imersão profunda","Natal na floresta"]},
  ];
  const[sel,setSel]=useState(null);
  const routePts=stops.map(s=>`${s.sx},${s.sy}`).join(' ');
  // Contorno simplificado do Brasil
  const brasil="M30,20 C36,17 44,16 52,17 C60,18 66,20 70,24 C73,27 74,30 76,33 C78,36 79,39 78,42 C77,46 74,49 70,51 C65,53 60,54 56,57 C52,60 50,64 47,66 C44,68 40,68 37,66 C34,64 33,60 32,56 C31,52 30,49 27,47 C24,45 21,44 20,40 C19,36 21,32 23,29 C25,26 27,22 30,20Z";
  const MapSVG=()=>(
    <svg viewBox="14 12 72 62" style={{width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="12" width="72" height="62" fill="#d0e8f5"/>
      {[20,30,40,50,60,70,80].map(x=>(<line key={x} x1={x} y1="12" x2={x} y2="74" stroke="rgba(255,255,255,0.4)" strokeWidth="0.15"/>))}
      {[15,25,35,45,55,65].map(y=>(<line key={y} x1="14" y1={y} x2="86" y2={y} stroke="rgba(255,255,255,0.4)" strokeWidth="0.15"/>))}
      <path d={brasil} fill="#e8e0ce" stroke="#c0b8a8" strokeWidth="0.3"/>
      <path d="M20,28 C26,26 32,27 36,30 C40,33 42,36 40,38 C36,40 30,39 26,37 C22,35 19,32 20,28Z" fill="rgba(80,120,70,0.18)"/>
      <polyline points={routePts} fill="none" stroke={G.gold} strokeWidth="0.7" strokeDasharray="2,1.2" opacity="0.9"/>
      <text x="16" y="66" fontSize="2.4" fill="rgba(30,73,118,0.55)" fontWeight="600">✈ de GVA</text>
      <text x="30" y="26" fontSize="2.2" fill="rgba(61,97,66,0.6)" fontWeight="600">AMAZÓNIA</text>
      <text x="66" y="45" fontSize="2.2" fill="rgba(181,50,42,0.55)" fontWeight="600">CEARÁ</text>
      {stops.map((s,i)=>{
        const isSel=sel===i; const r=isSel?4.2:3.2;
        const lr=s.sx>55;
        return(
          <g key={i} style={{cursor:"pointer"}} onClick={()=>setSel(sel===i?null:i)}>
            {isSel&&<circle cx={s.sx} cy={s.sy} r={r+2} fill={s.color} opacity="0.2"/>}
            <circle cx={s.sx} cy={s.sy} r={r} fill={s.color} stroke="#fff" strokeWidth={isSel?"0.9":"0.6"}/>
            <text x={s.sx} y={s.sy+0.8} textAnchor="middle" dominantBaseline="middle" fontSize={isSel?"2.6":"2"} fontWeight="700" fill="#fff">{s.n}</text>
            <text x={lr?s.sx-2.5:s.sx+2.5} y={s.sy+0.6} textAnchor={lr?"end":"start"} fontSize="2.1" fontWeight="600" fill={isSel?s.color:"#2a2018"} opacity={isSel?1:0.85}>{s.city}</text>
          </g>
        );
      })}
    </svg>
  );
  const selected=sel!=null?stops[sel]:null;
  return(
    <div>
      <div style={{padding:"20px 0 16px",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20}}>
        <p style={{fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:G.gold2,margin:"0 0 4px"}}>Percurso</p>
        <h2 style={{fontSize:22,fontWeight:500,margin:"0 0 6px"}}>Mapa da viagem</h2>
        <p style={{fontSize:13,color:G.warm,lineHeight:1.65,margin:0}}>6 etapas · do litoral leste (Ceará) ao alto Rio Negro. Clica num marcador.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start",marginBottom:20}}>
        <div style={{background:"#d0e8f5",borderRadius:16,overflow:"hidden",border:"0.5px solid rgba(0,0,0,0.1)",boxShadow:"0 4px 20px rgba(0,0,0,0.08)"}}>
          <div style={{padding:"10px 14px",background:G.ink,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.5)",letterSpacing:2,textTransform:"uppercase",margin:0}}>🇧🇷 BRASIL 2026</p>
            {sel!=null&&<span style={{fontSize:10,color:G.gold,fontWeight:600}}>← fechar</span>}
          </div>
          <div style={{aspectRatio:"1.1",position:"relative"}}><MapSVG/></div>
          <div style={{padding:"8px 12px",background:"rgba(255,255,255,0.7)",display:"flex",flexWrap:"wrap",gap:8}}>
            {stops.map((s,i)=>(
              <div key={i} onClick={()=>setSel(sel===i?null:i)} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",opacity:sel!=null&&sel!==i?0.45:1,transition:"opacity .2s"}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:s.color,display:"flex",alignItems:"center",justifyContent:"center",border:"1.5px solid #fff",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#fff"}}>{s.n}</span>
                </div>
                <span style={{fontSize:10,fontWeight:500,color:G.ink}}>{s.city}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {selected?(
            <div style={{background:"#fff",border:`0.5px solid ${selected.color}`,borderRadius:14,overflow:"hidden",borderTop:`3px solid ${selected.color}`}}>
              <div style={{padding:"14px 16px 10px",borderBottom:"0.5px solid rgba(0,0,0,0.07)",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:selected.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>{selected.n}</span>
                </div>
                <div>
                  <p style={{fontSize:16,fontWeight:600,margin:0,color:G.ink}}>{selected.city}</p>
                  <p style={{fontSize:11,color:selected.color,fontWeight:500,margin:0}}>{selected.days} · {selected.dates}</p>
                </div>
              </div>
              <div style={{padding:"12px 16px"}}>
                {selected.items.map((item,j)=>(
                  <div key={j} style={{display:"flex",gap:8,alignItems:"center",padding:"5px 0",borderBottom:"0.5px solid rgba(0,0,0,0.05)"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:selected.color,flexShrink:0}}/>
                    <span style={{fontSize:12.5,color:"#4a3a28"}}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <div style={{background:"rgba(200,144,42,0.06)",border:`1px dashed ${G.gold}`,borderRadius:14,padding:"28px 20px",textAlign:"center"}}>
              <p style={{fontSize:26,margin:"0 0 8px"}}>👆</p>
              <p style={{fontSize:13,color:G.warm,margin:0,lineHeight:1.65}}>Clica num número<br/>no mapa para ver<br/>as atividades da etapa.</p>
            </div>
          )}
        </div>
      </div>
      <div style={{background:G.ink,borderRadius:12,padding:"14px 20px"}}>
        <p style={{fontSize:12,fontWeight:500,color:"#e8c870",margin:"0 0 10px"}}>✈ Percurso completo</p>
        <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6}}>
          {[["✈ GVA","rgba(255,255,255,0.4)"],["→","rgba(255,255,255,0.2)"],["① Fortaleza",G.gold],["→ Canoa",G.red],["→ ✈ Jeri",G.blue],["→ ✈ Manaus",G.green],["→ 🛶 Baixo Rio Negro",G.green],["→ ✈ Alto Rio Negro",G.plum],["→","rgba(255,255,255,0.2)"],["✈ GVA","rgba(255,255,255,0.4)"]].map(([l,c],i)=>(
            <span key={i} style={{fontSize:11,fontWeight:l.startsWith("→")?400:600,color:c,whiteSpace:"nowrap"}}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const PANELS={route:RoutePanel,carte:CartePanel,reserver:ReserverPanel,contact:ContactPanel,hotels:HotelsPanel,transport:TransportPanel};
const TABS=[
  {id:"route",label:"🗺 Itinerário"},
  {id:"carte",label:"📍 Mapa"},
  {id:"reserver",label:"✅ A reservar"},
  {id:"contact",label:"✉ Contactos"},
  {id:"hotels",label:"🛏 Alojamentos"},
  {id:"transport",label:"✈ Transportes"},
];

export default function App(){
  const[active,setActive]=useState("route");
  const Panel=PANELS[active]||RoutePanel;
  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:900,margin:"0 auto",padding:"0 0 40px"}}>
      <div style={{background:"linear-gradient(135deg,#0d3d24,#1a7a48)",borderRadius:12,padding:"22px 20px",marginBottom:14,textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:120,opacity:0.05,color:"#fff",fontWeight:300,pointerEvents:"none",userSelect:"none"}}>🇧🇷</div>
        <p style={{fontSize:10,letterSpacing:4,textTransform:"uppercase",color:G.gold2,margin:"0 0 6px",position:"relative"}}>Norte do Brasil · 14–26 Dez 2026</p>
        <h1 style={{fontSize:36,fontWeight:500,color:"#fff",margin:"0 0 4px",position:"relative"}}>Brasil 2026</h1>
        <p style={{fontSize:12,color:"rgba(255,255,255,0.3)",letterSpacing:5,margin:"0 0 14px",position:"relative"}}>Ceará · Amazónia</p>
        <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",position:"relative"}}>
          {["✈ Ceará → Amazónia","14–26 Dezembro","2 adultos","Jeri + Canoa","Rio Negro profundo","Natal na floresta"].map(p=>(
            <span key={p} style={{background:"rgba(255,255,255,0.07)",border:"0.5px solid rgba(255,255,255,0.14)",borderRadius:100,padding:"4px 11px",fontSize:11,color:"rgba(255,255,255,0.65)"}}>{p}</span>
          ))}
        </div>
      </div>
      <div style={{display:"flex",overflowX:"auto",borderBottom:"0.5px solid rgba(0,0,0,0.1)",marginBottom:20,scrollbarWidth:"none"}}>
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActive(tab.id)} style={{flexShrink:0,padding:"10px 14px",fontSize:11,fontWeight:500,color:active===tab.id?G.ink:G.warm,background:"none",border:"none",borderBottom:active===tab.id?`2px solid ${G.gold}`:"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap",transition:"color .2s"}}>{tab.label}</button>
        ))}
      </div>
      <Panel/>
    </div>
  );
}
