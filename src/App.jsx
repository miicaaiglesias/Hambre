import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://urnsikwpxnqzlhuzzmfc.supabase.co";
const SUPABASE_KEY = "sb_publishable_wnXbPlE5BqkdiMd25zVeVQ_5EB9tJZW";

const db = async (path, method = "GET", body = null) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Supabase Realtime via WebSocket
const createRealtimeChannel = (tableName, onEvent) => {
  const wsUrl = `${SUPABASE_URL.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
  const ws = new WebSocket(wsUrl);
  let ref = 1;

  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: "realtime:*", event: "phx_join", payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: tableName }] } }, ref: String(ref++) }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.event === "postgres_changes" && msg.payload?.data) {
      onEvent(msg.payload.data);
    }
  };

  ws.onerror = () => {};
  return ws;
};

const CRITERIOS = [
  { id: "medallon", label: "Medallón", emoji: "🥩" },
  { id: "pan", label: "Pan", emoji: "🍞" },
  { id: "toppings", label: "Toppings", emoji: "🧀" },
  { id: "papas", label: "Papas", emoji: "🍟" },
  { id: "precio_calidad", label: "Precio/Calidad", emoji: "💰" },
  { id: "presentacion", label: "Presentación", emoji: "✨" },
];

const emptyScores = () => Object.fromEntries(CRITERIOS.map(c => [c.id, ""]));
const calcPromedio = scores => {
  const vals = Object.values(scores).map(Number).filter(v => v > 0);
  return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null;
};
const getFlames = val => {
  const n = Number(val);
  if (!n) return 0;
  if (n >= 9) return 5; if (n >= 7) return 4; if (n >= 5) return 3; if (n >= 3) return 2; return 1;
};
const FlameBar = ({ value, size=16 }) => (
  <span style={{ display:"inline-flex", gap:1 }}>
    {[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:size, opacity:i<=getFlames(value)?1:0.15 }}>🔥</span>)}
  </span>
);
const getMedalla = pos => ["🥇","🥈","🥉"][pos] || `#${pos+1}`;
const ORANGE="#FF6B2B", PINK="#FF4D8D";

// ─── RULETA ────────────────────────────────────────────────────────────────
function Ruleta({ opciones, onResultado, onCerrar, resultado, girando }) {
  const [idx, setIdx] = useState(0);
  const [localGirando, setLocalGirando] = useState(false);
  const animRef = useRef(null);

  // Cuando llega resultado sincronizado, animamos localmente
  useEffect(() => {
    if (girando && !localGirando) {
      setLocalGirando(true);
      let count = 0;
      const total = 35 + Math.floor(Math.random()*10);
      let current = Math.floor(Math.random()*opciones.length);
      const step = () => {
        current = (current+1) % opciones.length;
        setIdx(current);
        count++;
        const delay = count < total*0.5 ? 60 : count < total*0.8 ? 110 : count < total*0.95 ? 220 : 400;
        if (count < total) animRef.current = setTimeout(step, delay);
        else setLocalGirando(false);
      };
      animRef.current = setTimeout(step, 60);
    }
    return () => clearTimeout(animRef.current);
  }, [girando]);

  useEffect(() => {
    if (resultado && opciones.length) {
      const i = opciones.findIndex(o => o.id === resultado.id);
      if (i >= 0) setIdx(i);
    }
  }, [resultado]);

  return (
    <div style={rs.overlay}>
      <div style={rs.modal}>
        <button style={rs.closeBtn} onClick={onCerrar}>✕</button>
        <p style={rs.titulo}>🎰 Próxima hamburguesería</p>
        {opciones.length === 0 ? (
          <p style={{ color:"#aaa", textAlign:"center", margin:"32px 0" }}>No hay pendientes cargadas</p>
        ) : (
          <>
            <div style={rs.slotMachine}>
              <div style={rs.slotOverlayTop} />
              <div style={rs.slotOverlayBot} />
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%" }}>
                {opciones.map((op, i) => (
                  <div key={i} style={{ ...rs.slotItem, ...(i===idx ? rs.slotItemActive : {}) }}>
                    {i === idx ? op.nombre : (i === (idx-1+opciones.length)%opciones.length || i === (idx+1)%opciones.length ? op.nombre : "")}
                  </div>
                )).filter((_, i) => i === idx || i === (idx-1+opciones.length)%opciones.length || i === (idx+1)%opciones.length)}
              </div>
            </div>

            {!resultado ? (
              <button style={{ ...rs.girarBtn, opacity: localGirando||girando ? 0.6 : 1 }}
                onClick={onResultado} disabled={localGirando||girando}>
                {localGirando||girando ? "🎰 Girando..." : "🎰 ¡GIRAR!"}
              </button>
            ) : (
              <div style={rs.resultadoBox}>
                <p style={rs.resultadoLabel}>¡Le tocó!</p>
                <p style={rs.resultadoNombre}>{resultado.nombre}</p>
                {resultado.barrio && <p style={rs.resultadoBarrio}>📍 {resultado.barrio}</p>}
                <button style={rs.confirmarBtn} onClick={() => onCerrar(resultado)}>¡Vamos! 🍔</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const rs = {
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
  modal:{ background:"#1a0a00", border:`3px solid ${ORANGE}`, borderRadius:24, padding:"28px 24px", width:"100%", maxWidth:380, position:"relative", boxShadow:`0 0 60px rgba(255,107,43,0.4)` },
  closeBtn:{ position:"absolute", top:14, right:16, background:"none", border:"none", color:"#666", fontSize:18, cursor:"pointer" },
  titulo:{ fontFamily:"'Boogaloo',cursive", fontSize:24, color:ORANGE, textAlign:"center", margin:"0 0 20px", letterSpacing:2 },
  slotMachine:{ background:"#111", border:`2px solid #333`, borderRadius:16, height:160, overflow:"hidden", position:"relative", marginBottom:20 },
  slotOverlayTop:{ position:"absolute", top:0, left:0, right:0, height:55, background:"linear-gradient(to bottom, #1a0a00, transparent)", zIndex:2, pointerEvents:"none" },
  slotOverlayBot:{ position:"absolute", bottom:0, left:0, right:0, height:55, background:"linear-gradient(to top, #1a0a00, transparent)", zIndex:2, pointerEvents:"none" },
  slotItem:{ width:"100%", textAlign:"center", padding:"12px 20px", fontSize:14, color:"#555", fontFamily:"'Manrope',sans-serif", fontWeight:700, transition:"all 0.08s" },
  slotItemActive:{ fontSize:24, color:"#fff", textShadow:`0 0 20px ${ORANGE}`, background:"rgba(255,107,43,0.08)" },
  girarBtn:{ width:"100%", padding:"16px", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, border:"none", borderRadius:14, color:"#fff", fontSize:20, fontWeight:800, cursor:"pointer", fontFamily:"'Boogaloo',cursive", letterSpacing:2, boxShadow:`0 4px 20px rgba(255,107,43,0.5)` },
  resultadoBox:{ textAlign:"center" },
  resultadoLabel:{ color:"#888", fontSize:13, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:2 },
  resultadoNombre:{ fontFamily:"'Boogaloo',cursive", fontSize:32, color:ORANGE, margin:"0 0 4px", textShadow:`0 0 30px rgba(255,107,43,0.4)` },
  resultadoBarrio:{ color:"#888", fontSize:13, margin:"0 0 16px" },
  confirmarBtn:{ width:"100%", padding:"14px", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, border:"none", borderRadius:14, color:"#fff", fontSize:18, fontWeight:800, cursor:"pointer", fontFamily:"'Boogaloo',cursive" },
};

// ─── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(() => localStorage.getItem("hambre_usuario") || "");
  const [inputNombre, setInputNombre] = useState("");
  const [jugadores, setJugadores] = useState([]);
  const [hamburgueserias, setHamburgueserias] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [puntajesExistentes, setPuntajesExistentes] = useState([]);
  const [vista, setVista] = useState("ranking");
  const [hambActual, setHambActual] = useState(null);
  const [nuevaHamb, setNuevaHamb] = useState({ nombre:"", notas:"", precio:"", fecha:new Date().toISOString().split("T")[0] });
  const [nuevaPendiente, setNuevaPendiente] = useState({ nombre:"", barrio:"" });
  const [misPuntajes, setMisPuntajes] = useState(emptyScores());
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [nuevoJugador, setNuevoJugador] = useState("");
  const [puntajeIncompleto, setPuntajeIncompleto] = useState(false);

  // Ruleta sincronizada
  const [showRuleta, setShowRuleta] = useState(false);
  const [ruletaGirando, setRuletaGirando] = useState(false);
  const [ruletaResultado, setRuletaResultado] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  // Realtime: escuchar sorteos
  useEffect(() => {
    if (!usuario) return;
    const ws = createRealtimeChannel("sorteos", (data) => {
      if (data.table === "sorteos") {
        const record = data.record || data.new;
        if (!record) return;
        if (record.estado === "girando") {
          setRuletaGirando(true);
          setRuletaResultado(null);
          setShowRuleta(true);
        } else if (record.estado === "resultado") {
          setRuletaGirando(false);
          setRuletaResultado({ id: record.pendiente_id, nombre: record.nombre, barrio: record.barrio });
          setShowRuleta(true);
        }
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [usuario]);

  const cargarDatos = async () => {
    setLoadingInit(true);
    try {
      const [j, h, p, pend] = await Promise.all([
        db("jugadores?order=created_at.asc"),
        db("hamburgueserias?order=created_at.desc"),
        db("puntajes?select=*"),
        db("pendientes?order=created_at.asc"),
      ]);
      setJugadores(j||[]); setHamburgueserias(h||[]); setPuntajesExistentes(p||[]); setPendientes(pend||[]);
    } catch(e) { console.error(e); }
    setLoadingInit(false);
  };

  const entrar = async () => {
    if (!inputNombre.trim()) return;
    const nombre = inputNombre.trim();
    setLoading(true);
    try {
      const existe = await db(`jugadores?nombre=eq.${encodeURIComponent(nombre)}`);
      if (!existe || existe.length === 0) await db("jugadores", "POST", { nombre });
      localStorage.setItem("hambre_usuario", nombre);
      setUsuario(nombre);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const girarRuleta = async () => {
    if (pendientes.length === 0 || ruletaGirando) return;
    // Elegir ganador
    const ganador = pendientes[Math.floor(Math.random() * pendientes.length)];
    // Notificar a todos via sorteos table
    try {
      // primero señal "girando"
      await db("sorteos", "POST", { estado: "girando", pendiente_id: null, nombre: null, barrio: null });
      setRuletaGirando(true);
      setRuletaResultado(null);
      // esperar animación (~4s) y luego mandar resultado
      setTimeout(async () => {
        await db("sorteos", "POST", { estado: "resultado", pendiente_id: ganador.id, nombre: ganador.nombre, barrio: ganador.barrio });
        setRuletaGirando(false);
        setRuletaResultado(ganador);
      }, 4000);
    } catch(e) {
      // fallback local si falla el realtime
      setRuletaResultado(ganador);
      setRuletaGirando(false);
    }
  };

  const cerrarRuleta = (resultado) => {
    setShowRuleta(false);
    if (resultado && resultado.nombre) {
      setNuevaHamb(p => ({ ...p, nombre: resultado.nombre }));
      setVista("nueva");
    }
    setRuletaResultado(null);
    setRuletaGirando(false);
  };

  const guardarHamb = async () => {
    const faltantes = CRITERIOS.filter(c => !misPuntajes[c.id]);
    if (faltantes.length > 0) { setPuntajeIncompleto(true); return; }
    if (!nuevaHamb.nombre.trim()) return;
    setLoading(true);
    try {
      const promedio = calcPromedio(misPuntajes);
      const [hambCreada] = await db("hamburgueserias", "POST", {
        nombre: nuevaHamb.nombre, fecha: nuevaHamb.fecha, precio: nuevaHamb.precio,
        notas: nuevaHamb.notas, promedio_global: promedio, jugadores_presentes: [usuario],
      });
      await db("puntajes", "POST", {
        hamburgueseria_id: hambCreada.id, jugador: usuario,
        ...Object.fromEntries(CRITERIOS.map(c=>[c.id, Number(misPuntajes[c.id])||null])),
        promedio,
      });
      const pend = pendientes.find(p => p.nombre.toLowerCase() === nuevaHamb.nombre.toLowerCase());
      if (pend) await db(`pendientes?id=eq.${pend.id}`, "DELETE");
      setNuevaHamb({ nombre:"", notas:"", precio:"", fecha:new Date().toISOString().split("T")[0] });
      setMisPuntajes(emptyScores()); setPuntajeIncompleto(false);
      await cargarDatos(); setVista("ranking");
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const agregarMiPuntaje = async (hamb) => {
    const faltantes = CRITERIOS.filter(c => !misPuntajes[c.id]);
    if (faltantes.length > 0) { setPuntajeIncompleto(true); return; }
    setLoading(true);
    try {
      const promedio = calcPromedio(misPuntajes);
      await db("puntajes", "POST", {
        hamburgueseria_id: hamb.id, jugador: usuario,
        ...Object.fromEntries(CRITERIOS.map(c=>[c.id, Number(misPuntajes[c.id])||null])),
        promedio,
      });
      const presentes = [...(hamb.jugadores_presentes||[])];
      if (!presentes.includes(usuario)) presentes.push(usuario);
      const todosPuntajes = [...puntajesExistentes.filter(p=>p.hamburgueseria_id===hamb.id), { promedio }];
      const proms = todosPuntajes.map(p=>Number(p.promedio)).filter(v=>v>0);
      const nuevoGlobal = proms.length ? (proms.reduce((a,b)=>a+b,0)/proms.length).toFixed(1) : null;
      await db(`hamburgueserias?id=eq.${hamb.id}`, "PATCH", { jugadores_presentes:presentes, promedio_global:nuevoGlobal });
      setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); setHambActual(null);
      await cargarDatos();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const agregarPendiente = async () => {
    if (!nuevaPendiente.nombre.trim()) return;
    await db("pendientes", "POST", { nombre: nuevaPendiente.nombre, barrio: nuevaPendiente.barrio });
    setNuevaPendiente({ nombre:"", barrio:"" }); await cargarDatos();
  };

  const eliminarPendiente = async (id) => { await db(`pendientes?id=eq.${id}`, "DELETE"); await cargarDatos(); };

  const ranking = [...hamburgueserias].sort((a,b)=>(b.promedio_global||0)-(a.promedio_global||0));
  const mejor = ranking[0];
  const getPuntajesHamb = id => puntajesExistentes.filter(p=>p.hamburgueseria_id===id);
  const yaPuntue = id => puntajesExistentes.some(p=>p.hamburgueseria_id===id && p.jugador===usuario);

  if (!usuario) return (
    <div style={{ ...s.root, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <style>{fonts}</style>
      <div style={s.bg} />
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 24px", width:"100%", maxWidth:400 }}>
        <div style={{ fontSize:80, marginBottom:8 }}>🍔</div>
        <h1 style={{ ...s.title, fontSize:56, marginBottom:4 }}>HAMBRE</h1>
        <p style={{ color:"#aaa", marginBottom:32, fontSize:14, letterSpacing:2 }}>el mundial de las hamburgueserías</p>
        <div style={s.formGroup}>
          <label style={s.label}>¿Cómo te llamás?</label>
          <input style={{ ...s.input, textAlign:"center", fontSize:18 }} placeholder="Tu nombre"
            value={inputNombre} onChange={e=>setInputNombre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&entrar()} />
        </div>
        <button style={{ ...s.btnPrimary, opacity:inputNombre.trim()?1:0.5 }} onClick={entrar} disabled={loading}>
          {loading?"Entrando...":"¡Entrar al mundial! 🔥"}
        </button>
      </div>
    </div>
  );

  if (loadingInit) return (
    <div style={{ ...s.root, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <style>{fonts}</style><div style={s.bg} />
      <div style={{ position:"relative", zIndex:1, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🍔</div>
        <p style={{ color:"#888" }}>Cargando el mundial...</p>
      </div>
    </div>
  );

  return (
    <div style={s.root}>
      <style>{fonts}</style>
      <div style={s.bg} />
      {showRuleta && <Ruleta opciones={pendientes} onResultado={girarRuleta} onCerrar={cerrarRuleta} resultado={ruletaResultado} girando={ruletaGirando} />}

      <header style={s.header}>
        <div style={s.headerTop}>
          <span style={{ fontSize:32 }}>🍔</span>
          <div><h1 style={s.title}>HAMBRE</h1><p style={s.subtitle}>el mundial de las hamburgueserías</p></div>
          <span style={{ fontSize:32 }}>🔥</span>
        </div>
        {mejor && (
          <div style={s.mejorBanner}>
            <span style={s.mejorLabel}>🏆 Mejor hasta ahora:</span>
            <span style={s.mejorNombre}>{mejor.nombre}</span>
            <span style={s.mejorPuntaje}>{mejor.promedio_global}</span>
          </div>
        )}
        <p style={s.counter}>Hola, <strong>{usuario}</strong> · {hamburgueserias.length} visitada{hamburgueserias.length!==1?"s":""}</p>
      </header>

      <div style={s.sorteoBar}>
        <button style={s.sorteoBtn} onClick={()=>setShowRuleta(true)}>
          🎰 ¿A dónde vamos? ({pendientes.length} pendientes)
        </button>
      </div>

      <nav style={s.nav}>
        {[{id:"ranking",label:"🏆 Ranking"},{id:"nueva",label:"➕ Nueva"},{id:"pendientes",label:"📋 Lista"},{id:"jugadores",label:"👥 Equipo"}].map(item=>(
          <button key={item.id} style={{ ...s.navBtn, ...(vista===item.id&&!hambActual?s.navBtnActive:{}) }}
            onClick={()=>{ setVista(item.id); setHambActual(null); setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); }}>
            {item.label}
          </button>
        ))}
      </nav>

      <main style={s.main}>
        {vista==="ranking" && !hambActual && (
          <div>
            {ranking.length===0 ? (
              <div style={s.empty}>
                <div style={{ fontSize:72 }}>🍔</div>
                <p style={s.emptyTitle}>¡El torneo está por empezar!</p>
                <p style={s.emptyText}>Usá el sorteo para elegir la primera hamburguesería.</p>
                <button style={s.btnPrimary} onClick={()=>setShowRuleta(true)}>🎰 Sortear primera</button>
              </div>
            ) : (
              <div style={s.cards}>
                {ranking.map((h,i)=>(
                  <div key={h.id} style={{ ...s.card, ...(i===0?s.cardGold:i===1?s.cardSilver:i===2?s.cardBronze:{}) }}
                    onClick={()=>{ setHambActual(h); setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); }}>
                    <span style={s.medalla}>{getMedalla(i)}</span>
                    <div style={s.cardBody}>
                      <p style={s.cardNombre}>{h.nombre}</p>
                      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                        <FlameBar value={h.promedio_global} size={12} />
                        {h.fecha&&<span style={s.cardMeta}>{h.fecha}</span>}
                        {h.precio&&<span style={s.cardMeta}>💵 ${h.precio}</span>}
                        {!yaPuntue(h.id)&&<span style={{ ...s.cardMeta, background:"#fff3e0", color:ORANGE }}>¡Falta tu voto!</span>}
                      </div>
                    </div>
                    <div style={s.cardScore}>
                      <span style={s.scoreNum}>{h.promedio_global||"-"}</span>
                      <span style={s.scoreDen}>/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {vista==="ranking" && hambActual && (
          <div>
            <button style={s.back} onClick={()=>{ setHambActual(null); setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); }}>← Volver</button>
            <div style={s.detalleHeader}>
              <h2 style={s.detalleNombre}>{hambActual.nombre}</h2>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:6 }}>
                {hambActual.fecha&&<span style={s.detalleMeta}>📅 {hambActual.fecha}</span>}
                {hambActual.precio&&<span style={s.detalleMeta}>💵 ${hambActual.precio}</span>}
              </div>
              {hambActual.notas&&<p style={s.detalleNotas}>📝 {hambActual.notas}</p>}
              <div style={{ marginTop:8 }}><FlameBar value={hambActual.promedio_global} size={20} /></div>
            </div>
            <div style={s.detalleGrid}>
              {CRITERIOS.map(c=>{
                const pts=getPuntajesHamb(hambActual.id);
                const vals=pts.map(p=>Number(p[c.id])).filter(v=>v>0);
                const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"-";
                return (
                  <div key={c.id} style={s.criterioCard}>
                    <span style={{ fontSize:22 }}>{c.emoji}</span>
                    <span style={s.criterioLabel}>{c.label}</span>
                    <span style={s.criterioVal}>{avg}</span>
                    <FlameBar value={avg} size={10} />
                  </div>
                );
              })}
            </div>
            <p style={s.sectionTitle}>Puntajes por persona</p>
            <div style={s.jugadoresTable}>
              {getPuntajesHamb(hambActual.id).map(p=>(
                <div key={p.id} style={s.jugadorRow}>
                  <span style={s.jugadorNombre}>👤 {p.jugador}{p.jugador===usuario&&<span style={{ color:ORANGE, fontSize:11 }}> (vos)</span>}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <FlameBar value={p.promedio} size={12} />
                    <span style={s.jugadorProm}>{p.promedio||"-"}</span>
                  </div>
                </div>
              ))}
            </div>
            {!yaPuntue(hambActual.id) && (
              <div style={s.miPuntajeBox}>
                <p style={{ ...s.sectionTitle, color:ORANGE, marginBottom:16 }}>⚡ Tu puntaje pendiente</p>
                {puntajeIncompleto&&<div style={s.alertaIncompleto}>⚠️ Completá <strong>todos</strong> los criterios para guardar</div>}
                <div style={s.criteriosGrid}>
                  {CRITERIOS.map(c=>{
                    const falta=puntajeIncompleto&&!misPuntajes[c.id];
                    return (
                      <div key={c.id} style={{ ...s.criterioInput, ...(falta?{ background:"#fff0f0", borderRadius:10, padding:8 }:{}) }}>
                        <label style={{ ...s.criterioInputLabel, ...(falta?{ color:"#e55" }:{}) }}>{c.emoji} {c.label}{falta&&" ← ¡Falta!"}</label>
                        <div style={s.scoreButtons}>
                          {[1,2,3,4,5,6,7,8,9,10].map(n=>{
                            const sel=Number(misPuntajes[c.id])===n;
                            return <button key={n} style={{ ...s.scoreBtn, ...(sel?s.scoreBtnSel:{}) }}
                              onClick={()=>{ setMisPuntajes(prev=>({...prev,[c.id]:n})); setPuntajeIncompleto(false); }}>{n}</button>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button style={{ ...s.btnPrimary, marginTop:16 }} onClick={()=>agregarMiPuntaje(hambActual)} disabled={loading}>
                  {loading?"Guardando...":"Guardar mi puntaje 🔥"}
                </button>
              </div>
            )}
            <div style={s.promedioBox}>
              <span style={s.promedioLabel}>Promedio global 🔥</span>
              <span style={s.promedioVal}>{hambActual.promedio_global||"-"} / 10</span>
            </div>
          </div>
        )}

        {vista==="nueva" && (
          <div>
            <p style={s.sectionTitle}>Nueva hamburguesería</p>
            {puntajeIncompleto&&<div style={s.alertaIncompleto}>⚠️ Completá <strong>todos</strong> los criterios para guardar</div>}
            <div style={s.formGroup}>
              <label style={s.label}>Nombre del local</label>
              <input style={s.input} placeholder="Ej: La Burguesía..." value={nuevaHamb.nombre} onChange={e=>setNuevaHamb(p=>({...p,nombre:e.target.value}))} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={s.formGroup}>
                <label style={s.label}>Fecha</label>
                <input style={s.input} type="date" value={nuevaHamb.fecha} onChange={e=>setNuevaHamb(p=>({...p,fecha:e.target.value}))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Precio promedio</label>
                <input style={s.input} placeholder="Ej: 4500" value={nuevaHamb.precio} onChange={e=>setNuevaHamb(p=>({...p,precio:e.target.value}))} />
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Notas (opcional)</label>
              <input style={s.input} placeholder="Ej: Pedimos la especial..." value={nuevaHamb.notas} onChange={e=>setNuevaHamb(p=>({...p,notas:e.target.value}))} />
            </div>
            <div style={s.jugadorSection}>
              <p style={s.jugadorSectionTitle}>👤 Tu puntaje ({usuario})</p>
              <div style={s.criteriosGrid}>
                {CRITERIOS.map(c=>{
                  const falta=puntajeIncompleto&&!misPuntajes[c.id];
                  return (
                    <div key={c.id} style={{ ...s.criterioInput, ...(falta?{ background:"#fff0f0", borderRadius:10, padding:8 }:{}) }}>
                      <label style={{ ...s.criterioInputLabel, ...(falta?{ color:"#e55" }:{}) }}>{c.emoji} {c.label}{falta&&" ← ¡Falta!"}</label>
                      <div style={s.scoreButtons}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n=>{
                          const sel=Number(misPuntajes[c.id])===n;
                          return <button key={n} style={{ ...s.scoreBtn, ...(sel?s.scoreBtnSel:{}) }}
                            onClick={()=>{ setMisPuntajes(prev=>({...prev,[c.id]:n})); setPuntajeIncompleto(false); }}>{n}</button>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <button style={{ ...s.btnPrimary, opacity:nuevaHamb.nombre.trim()?1:0.5, marginTop:24 }} onClick={guardarHamb} disabled={loading}>
              {loading?"Guardando...":"¡Guardar resultado! 🔥"}
            </button>
          </div>
        )}

        {vista==="pendientes" && (
          <div>
            <p style={s.sectionTitle}>Lista de pendientes</p>
            <button style={{ ...s.btnPrimary, marginBottom:20, fontSize:15 }} onClick={()=>setShowRuleta(true)}>🎰 Sortear próxima</button>
            <div style={s.formGroup}>
              <label style={s.label}>Agregar hamburguesería</label>
              <input style={s.input} placeholder="Nombre del local" value={nuevaPendiente.nombre} onChange={e=>setNuevaPendiente(p=>({...p,nombre:e.target.value}))} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Barrio (opcional)</label>
              <input style={s.input} placeholder="Ej: Palermo, Belgrano..." value={nuevaPendiente.barrio}
                onChange={e=>setNuevaPendiente(p=>({...p,barrio:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&agregarPendiente()} />
            </div>
            <button style={{ ...s.btnPrimary, opacity:nuevaPendiente.nombre.trim()?1:0.5, marginBottom:24 }} onClick={agregarPendiente}>Agregar a la lista</button>
            <div style={s.cards}>
              {pendientes.map(p=>(
                <div key={p.id} style={{ ...s.card, alignItems:"center" }}>
                  <span style={{ fontSize:22 }}>🍔</span>
                  <div style={s.cardBody}>
                    <p style={{ ...s.cardNombre, margin:0 }}>{p.nombre}</p>
                    {p.barrio&&<p style={{ margin:"4px 0 0", fontSize:12, color:"#aaa" }}>📍 {p.barrio}</p>}
                  </div>
                  <button style={{ background:"none", border:"none", color:"#ddd", fontSize:18, cursor:"pointer" }} onClick={()=>eliminarPendiente(p.id)}>✕</button>
                </div>
              ))}
              {pendientes.length===0&&<p style={{ color:"#bbb", textAlign:"center", padding:"32px 0" }}>No hay pendientes</p>}
            </div>
          </div>
        )}

        {vista==="jugadores" && (
          <div>
            <p style={s.sectionTitle}>El equipo</p>
            <div style={s.jugadoresList}>
              {jugadores.map(j=>(
                <div key={j.id} style={{ ...s.jugadorChip, ...(j.nombre===usuario?{ border:`2px solid ${ORANGE}`, background:"#fff8f3" }:{}) }}>
                  👤 {j.nombre}{j.nombre===usuario&&<span style={{ color:ORANGE, fontSize:12, fontWeight:700 }}> (vos)</span>}
                </div>
              ))}
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Agregar integrante</label>
              <div style={{ display:"flex", gap:8 }}>
                <input style={{ ...s.input, flex:1 }} placeholder="Nombre" value={nuevoJugador} onChange={e=>setNuevoJugador(e.target.value)} />
                <button style={{ ...s.btnPrimary, width:"auto", padding:"0 20px" }} onClick={async()=>{
                  if(!nuevoJugador.trim()||jugadores.find(j=>j.nombre===nuevoJugador.trim())) return;
                  await db("jugadores","POST",{nombre:nuevoJugador.trim()}); setNuevoJugador(""); await cargarDatos();
                }}>Agregar</button>
              </div>
            </div>
            <button style={{ ...s.btnPrimary, background:"#f5f5f5", color:"#aaa", boxShadow:"none", marginTop:8 }}
              onClick={()=>{ localStorage.removeItem("hambre_usuario"); setUsuario(""); setInputNombre(""); }}>
              Cambiar mi nombre
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Boogaloo&family=Manrope:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  input { outline: none; }
  button { transition: transform 0.1s; }
  button:active { transform: scale(0.96); }
`;

const s = {
  root:{ minHeight:"100vh", background:"#FFF8F0", fontFamily:"'Manrope',sans-serif", position:"relative", overflowX:"hidden" },
  bg:{ position:"fixed", inset:0, zIndex:0, backgroundImage:`radial-gradient(circle at 10% 10%, #FFE8D6 0%, transparent 40%), radial-gradient(circle at 90% 90%, #FFD6E8 0%, transparent 40%)`, pointerEvents:"none" },
  header:{ position:"relative", zIndex:1, background:`linear-gradient(135deg, ${ORANGE} 0%, ${PINK} 100%)`, padding:"20px 20px 14px", textAlign:"center", borderRadius:"0 0 24px 24px", boxShadow:"0 4px 20px rgba(255,107,43,0.35)" },
  headerTop:{ display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:6 },
  title:{ margin:0, fontSize:40, fontFamily:"'Boogaloo',cursive", color:"#fff", letterSpacing:4, lineHeight:1, textShadow:"2px 3px 0 rgba(0,0,0,0.15)" },
  subtitle:{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.85)", letterSpacing:2, textTransform:"uppercase" },
  counter:{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,0.8)" },
  mejorBanner:{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"6px 14px", margin:"8px auto 4px", maxWidth:340, flexWrap:"wrap" },
  mejorLabel:{ fontSize:11, color:"rgba(255,255,255,0.8)" },
  mejorNombre:{ fontSize:14, fontWeight:800, color:"#fff" },
  mejorPuntaje:{ fontSize:16, fontFamily:"'Boogaloo',cursive", color:"#FFD23F", fontWeight:800 },
  sorteoBar:{ position:"relative", zIndex:1, padding:"10px 16px", background:"#fff", borderBottom:"1px solid #f0e8e0" },
  sorteoBtn:{ width:"100%", padding:"12px", background:`linear-gradient(135deg, #1a0a00, #2d1500)`, border:`2px solid ${ORANGE}`, borderRadius:12, color:ORANGE, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Boogaloo',cursive", letterSpacing:1 },
  nav:{ position:"relative", zIndex:1, display:"flex", background:"#fff", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" },
  navBtn:{ flex:1, padding:"12px 4px", background:"none", border:"none", color:"#bbb", fontSize:12, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontWeight:700, whiteSpace:"nowrap" },
  navBtnActive:{ color:ORANGE, borderBottom:`3px solid ${ORANGE}`, background:"#fff8f3" },
  main:{ position:"relative", zIndex:1, maxWidth:600, margin:"0 auto", padding:"20px 16px 80px" },
  empty:{ textAlign:"center", padding:"48px 20px" },
  emptyTitle:{ fontSize:20, fontWeight:800, color:"#333", margin:"12px 0 8px" },
  emptyText:{ fontSize:14, color:"#aaa", marginBottom:24 },
  cards:{ display:"flex", flexDirection:"column", gap:10 },
  card:{ display:"flex", alignItems:"center", gap:12, background:"#fff", borderRadius:16, padding:"14px 16px", cursor:"pointer", boxShadow:"0 2px 10px rgba(0,0,0,0.07)", border:"2px solid transparent" },
  cardGold:{ border:"2px solid #FFD23F", background:"#fffdf0" },
  cardSilver:{ border:"2px solid #ddd" },
  cardBronze:{ border:"2px solid #e8c49a", background:"#fdf7f0" },
  medalla:{ fontSize:24, minWidth:32, textAlign:"center" },
  cardBody:{ flex:1 },
  cardNombre:{ margin:"0 0 4px", fontSize:15, fontWeight:800, color:"#222" },
  cardMeta:{ fontSize:11, color:"#aaa", background:"#f5f5f5", padding:"2px 7px", borderRadius:20 },
  cardScore:{ textAlign:"right" },
  scoreNum:{ fontSize:24, fontWeight:800, color:ORANGE, fontFamily:"'Boogaloo',cursive" },
  scoreDen:{ fontSize:11, color:"#bbb", display:"block" },
  back:{ background:"none", border:"none", color:ORANGE, fontSize:14, cursor:"pointer", padding:"0 0 16px", fontFamily:"'Manrope',sans-serif", fontWeight:700 },
  detalleHeader:{ marginBottom:20 },
  detalleNombre:{ fontSize:24, fontWeight:800, color:"#222", margin:"0 0 6px" },
  detalleMeta:{ fontSize:12, color:"#aaa", background:"#f5f5f5", padding:"3px 10px", borderRadius:20 },
  detalleNotas:{ fontSize:13, color:"#888", fontStyle:"italic", margin:"8px 0 0" },
  detalleGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 },
  criterioCard:{ background:"#fff", borderRadius:14, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  criterioLabel:{ fontSize:10, color:"#aaa", textAlign:"center" },
  criterioVal:{ fontSize:20, fontWeight:800, color:ORANGE, fontFamily:"'Boogaloo',cursive" },
  sectionTitle:{ fontSize:12, letterSpacing:2, color:"#bbb", textTransform:"uppercase", margin:"0 0 14px", fontWeight:700 },
  jugadoresTable:{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 },
  jugadorRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", borderRadius:12, padding:"12px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" },
  jugadorNombre:{ fontSize:15, fontWeight:700 },
  jugadorProm:{ fontSize:20, fontWeight:800, color:ORANGE, fontFamily:"'Boogaloo',cursive" },
  miPuntajeBox:{ background:"#fff8f3", border:`2px solid ${ORANGE}`, borderRadius:16, padding:"16px", marginBottom:16 },
  promedioBox:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, borderRadius:16, padding:"18px 20px", marginTop:16 },
  promedioLabel:{ fontSize:13, color:"rgba(255,255,255,0.9)", fontWeight:700 },
  promedioVal:{ fontSize:28, fontWeight:800, color:"#fff", fontFamily:"'Boogaloo',cursive" },
  alertaIncompleto:{ background:"#fff0f0", border:"2px solid #ffaaaa", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#c00", marginBottom:16 },
  formGroup:{ marginBottom:16 },
  label:{ display:"block", fontSize:11, letterSpacing:2, color:"#bbb", textTransform:"uppercase", marginBottom:8, fontWeight:700 },
  input:{ width:"100%", background:"#fff", border:"2px solid #eee", borderRadius:12, padding:"12px 14px", color:"#333", fontSize:15, fontFamily:"'Manrope',sans-serif" },
  jugadorSection:{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:14, boxShadow:"0 2px 10px rgba(0,0,0,0.06)" },
  jugadorSectionTitle:{ margin:"0 0 14px", fontSize:16, fontWeight:800, color:"#333" },
  criteriosGrid:{ display:"flex", flexDirection:"column", gap:14 },
  criterioInput:{},
  criterioInputLabel:{ fontSize:13, color:"#888", display:"block", marginBottom:8, fontWeight:700 },
  scoreButtons:{ display:"flex", gap:5, flexWrap:"wrap" },
  scoreBtn:{ width:34, height:34, background:"#f5f5f5", border:"2px solid #eee", borderRadius:8, color:"#888", fontSize:13, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontWeight:700 },
  scoreBtnSel:{ background:ORANGE, border:`2px solid ${ORANGE}`, color:"#fff", transform:"scale(1.15)" },
  btnPrimary:{ background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, color:"#fff", border:"none", borderRadius:14, padding:"15px 24px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Manrope',sans-serif", width:"100%", boxShadow:"0 4px 16px rgba(255,107,43,0.35)" },
  jugadoresList:{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 },
  jugadorChip:{ background:"#fff", borderRadius:12, padding:"13px 16px", fontSize:15, fontWeight:700, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"2px solid transparent" },
};
