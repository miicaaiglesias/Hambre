import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://urnsikwpxnqzlhuzzmfc.supabase.co";
const SUPABASE_KEY = "sb_publishable_wnXbPlE5BqkdiMd25zVeVQ_5EB9tJZW";
const ADMINS = ["Mica"];
const ORANGE = "#FF6B2B", PINK = "#FF4D8D";

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

const createRealtimeChannel = (tableName, onEvent) => {
  const wsUrl = `${SUPABASE_URL.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => ws.send(JSON.stringify({ topic: "realtime:*", event: "phx_join", payload: { config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: tableName }] } }, ref: "1" }));
  ws.onmessage = (e) => { const msg = JSON.parse(e.data); if (msg.event === "postgres_changes" && msg.payload?.data) onEvent(msg.payload.data); };
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
const calcPromedio = scores => { const vals = Object.values(scores).map(Number).filter(v => v > 0); return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : null; };
const getFlames = val => { const n = Number(val); if (!n) return 0; if (n>=9) return 5; if (n>=7) return 4; if (n>=5) return 3; if (n>=3) return 2; return 1; };
const FlameBar = ({ value, size=16 }) => (<span style={{ display:"inline-flex", gap:1 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize:size, opacity:i<=getFlames(value)?1:0.15 }}>🔥</span>)}</span>);
const getMedalla = pos => ["🥇","🥈","🥉"][pos] || `#${pos+1}`;

// ─── TRANSFORMAR FOTO CON IA ─────────────────────────────────────────────


// ─── RULETA ───────────────────────────────────────────────────────────────
function Ruleta({ opciones, onResultado, onCerrar, resultado, girando }) {
  const [idx, setIdx] = useState(0);
  const [localGirando, setLocalGirando] = useState(false);
  const animRef = useRef(null);

  useEffect(() => {
    if (girando && !localGirando) {
      setLocalGirando(true);
      let count = 0, total = 35 + Math.floor(Math.random()*10), current = Math.floor(Math.random()*opciones.length);
      const step = () => { current = (current+1)%opciones.length; setIdx(current); count++; const delay = count<total*0.5?60:count<total*0.8?110:count<total*0.95?220:400; if (count<total) animRef.current=setTimeout(step,delay); else setLocalGirando(false); };
      animRef.current = setTimeout(step, 60);
    }
    return () => clearTimeout(animRef.current);
  }, [girando]);

  useEffect(() => { if (resultado && opciones.length) { const i = opciones.findIndex(o=>o.id===resultado.id); if (i>=0) setIdx(i); } }, [resultado]);

  return (
    <div style={rs.overlay}>
      <div style={rs.modal}>
        <button style={rs.closeBtn} onClick={onCerrar}>✕</button>
        <p style={rs.titulo}>🎰 Próxima hamburguesería</p>
        {opciones.length === 0 ? <p style={{ color:"#aaa", textAlign:"center", margin:"32px 0" }}>No hay pendientes</p> : (
          <>
            <div style={rs.slotMachine}>
              <div style={rs.slotOverlayTop} /><div style={rs.slotOverlayBot} />
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%" }}>
                {opciones.filter((_,i)=>i===idx||i===(idx-1+opciones.length)%opciones.length||i===(idx+1)%opciones.length).map((op,i)=>(
                  <div key={i} style={{ ...rs.slotItem, ...(op===opciones[idx]?rs.slotItemActive:{}) }}>{op.nombre}</div>
                ))}
              </div>
            </div>
            {!resultado ? (
              <button style={{ ...rs.girarBtn, opacity:localGirando||girando?0.6:1 }} onClick={onResultado} disabled={localGirando||girando}>
                {localGirando||girando?"🎰 Girando...":"🎰 ¡GIRAR!"}
              </button>
            ) : (
              <div style={rs.resultadoBox}>
                <p style={rs.resultadoLabel}>¡Le tocó!</p>
                <p style={rs.resultadoNombre}>{resultado.nombre}</p>
                {resultado.barrio&&<p style={rs.resultadoBarrio}>📍 {resultado.barrio}</p>}
                <button style={rs.confirmarBtn} onClick={()=>onCerrar(resultado)}>¡Vamos! 🍔</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const rs = {
  overlay:{ position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20 },
  modal:{ background:"#1a0a00",border:`3px solid ${ORANGE}`,borderRadius:24,padding:"28px 24px",width:"100%",maxWidth:380,position:"relative",boxShadow:`0 0 60px rgba(255,107,43,0.4)` },
  closeBtn:{ position:"absolute",top:14,right:16,background:"none",border:"none",color:"#666",fontSize:18,cursor:"pointer" },
  titulo:{ fontFamily:"'Manrope',sans-serif",fontSize:22,fontWeight:800,color:ORANGE,textAlign:"center",margin:"0 0 20px",letterSpacing:1 },
  slotMachine:{ background:"#111",border:`2px solid #333`,borderRadius:16,height:160,overflow:"hidden",position:"relative",marginBottom:20 },
  slotOverlayTop:{ position:"absolute",top:0,left:0,right:0,height:55,background:"linear-gradient(to bottom, #1a0a00, transparent)",zIndex:2,pointerEvents:"none" },
  slotOverlayBot:{ position:"absolute",bottom:0,left:0,right:0,height:55,background:"linear-gradient(to top, #1a0a00, transparent)",zIndex:2,pointerEvents:"none" },
  slotItem:{ width:"100%",textAlign:"center",padding:"12px 20px",fontSize:14,color:"#555",fontFamily:"'Manrope',sans-serif",fontWeight:700,transition:"all 0.08s" },
  slotItemActive:{ fontSize:24,color:"#fff",textShadow:`0 0 20px ${ORANGE}`,background:"rgba(255,107,43,0.08)" },
  girarBtn:{ width:"100%",padding:"16px",background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`,border:"none",borderRadius:14,color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer",fontFamily:"'Manrope',sans-serif",letterSpacing:1,boxShadow:`0 4px 20px rgba(255,107,43,0.5)` },
  resultadoBox:{ textAlign:"center" },
  resultadoLabel:{ color:"#888",fontSize:13,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:2 },
  resultadoNombre:{ fontFamily:"'Manrope',sans-serif",fontSize:28,fontWeight:800,color:ORANGE,margin:"0 0 4px" },
  resultadoBarrio:{ color:"#888",fontSize:13,margin:"0 0 16px" },
  confirmarBtn:{ width:"100%",padding:"14px",background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`,border:"none",borderRadius:14,color:"#fff",fontSize:18,fontWeight:800,cursor:"pointer",fontFamily:"'Manrope',sans-serif" },
};

// ─── PANTALLA ACCESO ──────────────────────────────────────────────────────
function PantallaAcceso({ onAcceso }) {
  const [paso, setPaso] = useState("codigo");
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verificarCodigo = async () => {
    if (!codigo.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await db(`acceso?codigo=eq.${encodeURIComponent(codigo.trim().toUpperCase())}`);
      if (res && res.length > 0) setPaso("nombre");
      else setError("Código incorrecto. Pedíselo a alguien del grupo 🍔");
    } catch(e) { setError("Error al verificar. Intentá de nuevo."); }
    setLoading(false);
  };

  const solicitarAcceso = async () => {
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const existe = await db(`jugadores?nombre=eq.${encodeURIComponent(nombre.trim())}`);
      if (existe && existe.length > 0) { localStorage.setItem("hambre_usuario", nombre.trim()); onAcceso(nombre.trim()); return; }
      const yaEspera = await db(`solicitudes?nombre=eq.${encodeURIComponent(nombre.trim())}&estado=eq.pendiente`);
      if (yaEspera && yaEspera.length > 0) { setPaso("pendiente"); return; }
      const rechazado = await db(`solicitudes?nombre=eq.${encodeURIComponent(nombre.trim())}&estado=eq.rechazado`);
      if (rechazado && rechazado.length > 0) { setPaso("rechazado"); return; }
      await db("solicitudes", "POST", { nombre: nombre.trim(), estado: "pendiente" });
      setPaso("pendiente");
    } catch(e) { setError("Error. Intentá de nuevo."); }
    setLoading(false);
  };

  return (
    <div style={{ ...s.root, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <style>{fonts}</style><div style={s.bg} />
      <div style={{ position:"relative", zIndex:1, textAlign:"center", padding:"0 24px", width:"100%", maxWidth:400 }}>
        <div style={{ fontSize:72, marginBottom:8 }}>🍔</div>
        <h1 style={{ ...s.title, fontSize:52, marginBottom:4 }}>HAMBRE</h1>
        <p style={{ color:"#aaa", marginBottom:32, fontSize:13, letterSpacing:2 }}>el mundial de las hamburgueserías</p>
        {paso==="codigo" && (<>
          <p style={{ color:"#888", fontSize:14, marginBottom:16 }}>Ingresá el código del grupo para entrar</p>
          <div style={s.formGroup}><input style={{ ...s.input, textAlign:"center", fontSize:20, letterSpacing:4, textTransform:"uppercase", fontWeight:700 }} placeholder="HAMBRE-0000" value={codigo} onChange={e=>setCodigo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verificarCodigo()} /></div>
          {error&&<p style={{ color:"#e55", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button style={{ ...s.btnPrimary, opacity:codigo.trim()?1:0.5 }} onClick={verificarCodigo} disabled={loading}>{loading?"Verificando...":"Entrar 🔥"}</button>
        </>)}
        {paso==="nombre" && (<>
          <p style={{ color:"#888", fontSize:14, marginBottom:16 }}>¡Código correcto! ¿Cómo te llamás?</p>
          <div style={s.formGroup}><input style={{ ...s.input, textAlign:"center", fontSize:18 }} placeholder="Tu nombre" value={nombre} onChange={e=>setNombre(e.target.value)} onKeyDown={e=>e.key==="Enter"&&solicitarAcceso()} /></div>
          {error&&<p style={{ color:"#e55", fontSize:13, marginBottom:12 }}>{error}</p>}
          <button style={{ ...s.btnPrimary, opacity:nombre.trim()?1:0.5 }} onClick={solicitarAcceso} disabled={loading}>{loading?"Entrando...":"¡Unirme al mundial! 🍔"}</button>
        </>)}
        {paso==="pendiente" && (<div style={{ background:"#fff", borderRadius:20, padding:"32px 24px", boxShadow:"0 4px 20px rgba(0,0,0,0.08)" }}><div style={{ fontSize:48, marginBottom:12 }}>⏳</div><p style={{ fontSize:18, fontWeight:800, color:"#333", margin:"0 0 8px" }}>Solicitud enviada</p><p style={{ fontSize:14, color:"#888" }}>Avisale a Mica que te acepte. Una vez aprobado, volvé a entrar.</p></div>)}
        {paso==="rechazado" && (<div style={{ background:"#fff", borderRadius:20, padding:"32px 24px", boxShadow:"0 4px 20px rgba(0,0,0,0.08)" }}><div style={{ fontSize:48, marginBottom:12 }}>😅</div><p style={{ fontSize:18, fontWeight:800, color:"#333", margin:"0 0 8px" }}>Acceso denegado</p><p style={{ fontSize:14, color:"#888" }}>Tu solicitud fue rechazada.</p></div>)}
      </div>
    </div>
  );
}

// ─── POPUP INTEGRANTE ─────────────────────────────────────────────────────
function PopupIntegrante({ jugador, puntajes, hamburgueserias, onCerrar }) {
  const misPuntajes = puntajes.filter(p => p.jugador === jugador.nombre);
  const promedio = misPuntajes.length ? (misPuntajes.map(p=>Number(p.promedio)).filter(v=>v>0).reduce((a,b)=>a+b,0)/misPuntajes.length).toFixed(1) : null;

  return (
    <div style={rs.overlay} onClick={onCerrar}>
      <div style={{ ...rs.modal, background:"#fff", border:`3px solid ${ORANGE}`, maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <button style={{ ...rs.closeBtn, color:"#aaa" }} onClick={onCerrar}>✕</button>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          {jugador.avatar_url ? (
            <img src={jugador.avatar_url} style={{ width:80, height:80, borderRadius:"50%", objectFit:"cover", margin:"0 auto 8px", display:"block" }} alt="avatar" />
          ) : jugador.avatar_emoji ? (
            <div style={{ fontSize:48, marginBottom:8 }}>{jugador.avatar_emoji}</div>
          ) : (
            <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, margin:"0 auto 8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:"#fff" }}>👤</div>
          )}
          <p style={{ margin:0, fontSize:20, fontWeight:800, color:"#222" }}>{jugador.nombre}</p>
          {jugador.apodo && <p style={{ margin:"4px 0 0", fontSize:13, color:ORANGE, fontWeight:700 }}>{jugador.apodo}</p>}
          {promedio && <p style={{ margin:"8px 0 0", fontSize:13, color:"#aaa" }}>Promedio: <strong style={{ color:ORANGE }}>{promedio}</strong></p>}
        </div>
        <p style={{ ...s.sectionTitle, marginBottom:12 }}>Sus puntajes</p>
        {misPuntajes.length === 0 ? (
          <p style={{ color:"#aaa", textAlign:"center", padding:"20px 0" }}>Todavía no puntuó ninguna</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {misPuntajes.map(p => {
              const hamb = hamburgueserias.find(h => h.id === p.hamburgueseria_id);
              return hamb ? (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#f9f9f9", borderRadius:12, padding:"12px 16px" }}>
                  <span style={{ fontSize:14, fontWeight:700, color:"#333" }}>🍔 {hamb.nombre}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <FlameBar value={p.promedio} size={11} />
                    <span style={{ fontSize:18, fontWeight:800, color:ORANGE }}>{p.promedio}</span>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [usuario, setUsuario] = useState(() => localStorage.getItem("hambre_usuario") || "");
  const [aprobado, setAprobado] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [hamburgueserias, setHamburgueserias] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [puntajesExistentes, setPuntajesExistentes] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [vista, setVista] = useState("ranking");
  const [hambActual, setHambActual] = useState(null);
  const [nuevaHamb, setNuevaHamb] = useState({ nombre:"", notas:"", precio:"", fecha:new Date().toISOString().split("T")[0] });
  const [nuevaPendiente, setNuevaPendiente] = useState({ nombre:"", barrio:"" });
  const [misPuntajes, setMisPuntajes] = useState(emptyScores());
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [puntajeIncompleto, setPuntajeIncompleto] = useState(false);
  const [comentario, setComentario] = useState("");
  const [showRuleta, setShowRuleta] = useState(false);
  const [ruletaGirando, setRuletaGirando] = useState(false);
  const [ruletaResultado, setRuletaResultado] = useState(null);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => { if (usuario) verificarAprobacion(); }, [usuario]);

  const verificarAprobacion = async () => {
    setLoadingInit(true);
    try {
      const existe = await db(`jugadores?nombre=eq.${encodeURIComponent(usuario)}`);
      if (existe && existe.length > 0) { setAprobado(true); await cargarDatos(); }
      else {
        const sol = await db(`solicitudes?nombre=eq.${encodeURIComponent(usuario)}&estado=eq.aprobado`);
        if (sol && sol.length > 0) { await db("jugadores", "POST", { nombre: usuario }); setAprobado(true); await cargarDatos(); }
        else { setAprobado(false); setLoadingInit(false); }
      }
    } catch(e) { setLoadingInit(false); }
  };

  useEffect(() => {
    if (!usuario || !aprobado) return;
    const ws = createRealtimeChannel("sorteos", (data) => {
      if (data.table === "sorteos") {
        const record = data.record || data.new;
        if (!record) return;
        if (record.estado === "girando") { setRuletaGirando(true); setRuletaResultado(null); setShowRuleta(true); }
        else if (record.estado === "resultado") { setRuletaGirando(false); setRuletaResultado({ id:record.pendiente_id, nombre:record.nombre, barrio:record.barrio }); setShowRuleta(true); }
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [usuario, aprobado]);

  const cargarDatos = async () => {
    try {
      const [j, h, p, pend, sol] = await Promise.all([
        db("jugadores?order=created_at.asc"),
        db("hamburgueserias?order=created_at.desc"),
        db("puntajes?select=*"),
        db("pendientes?order=created_at.asc"),
        db("solicitudes?estado=eq.pendiente&order=created_at.asc"),
      ]);
      setJugadores(j||[]); setHamburgueserias(h||[]); setPuntajesExistentes(p||[]); setPendientes(pend||[]); setSolicitudes(sol||[]);
    } catch(e) { console.error(e); }
    setLoadingInit(false);
  };

  const subirFotoPerfil = async (file) => {
    if (!file) return;
    setSubiendoFoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1];
        const resultado = await transformarFotoConIA(base64);
        const jugadorActual = jugadores.find(j => j.nombre === usuario);
        if (jugadorActual && resultado.imageUrl) {
          await db(`jugadores?id=eq.${jugadorActual.id}`, "PATCH", {
            avatar_url: resultado.imageUrl,
            apodo: jugadorActual.apodo || "Hamburguer Star",
            descripcion_avatar: resultado.accesorios || ""
          });
          await cargarDatos();
        }
        setSubiendoFoto(false);
      };
      reader.readAsDataURL(file);
    } catch(e) { console.error(e); setSubiendoFoto(false); }
  };

  const aprobarSolicitud = async (sol) => { await db(`solicitudes?id=eq.${sol.id}`, "PATCH", { estado:"aprobado" }); await db("jugadores","POST",{ nombre:sol.nombre }); await cargarDatos(); };
  const rechazarSolicitud = async (sol) => { await db(`solicitudes?id=eq.${sol.id}`, "PATCH", { estado:"rechazado" }); await cargarDatos(); };
  const onAcceso = (nombre) => { localStorage.setItem("hambre_usuario", nombre); setUsuario(nombre); };

  const girarRuleta = async () => {
    if (pendientes.length === 0 || ruletaGirando) return;
    const ganador = pendientes[Math.floor(Math.random()*pendientes.length)];
    try {
      await db("sorteos","POST",{ estado:"girando", pendiente_id:null, nombre:null, barrio:null });
      setRuletaGirando(true); setRuletaResultado(null);
      setTimeout(async () => { await db("sorteos","POST",{ estado:"resultado", pendiente_id:ganador.id, nombre:ganador.nombre, barrio:ganador.barrio }); setRuletaGirando(false); setRuletaResultado(ganador); }, 4000);
    } catch(e) { setRuletaResultado(ganador); setRuletaGirando(false); }
  };

  const cerrarRuleta = (resultado) => { setShowRuleta(false); if (resultado?.nombre) { setNuevaHamb(p=>({...p,nombre:resultado.nombre})); setVista("nueva"); } setRuletaResultado(null); setRuletaGirando(false); };

  const guardarHamb = async () => {
    const faltantes = CRITERIOS.filter(c=>!misPuntajes[c.id]);
    if (faltantes.length > 0) { setPuntajeIncompleto(true); return; }
    if (!nuevaHamb.nombre.trim()) return;
    setLoading(true);
    try {
      const promedio = calcPromedio(misPuntajes);
      const [hambCreada] = await db("hamburgueserias","POST",{ nombre:nuevaHamb.nombre, fecha:nuevaHamb.fecha, precio:nuevaHamb.precio, notas:nuevaHamb.notas, promedio_global:promedio, jugadores_presentes:[usuario] });
      await db("puntajes","POST",{ hamburgueseria_id:hambCreada.id, jugador:usuario, ...Object.fromEntries(CRITERIOS.map(c=>[c.id,Number(misPuntajes[c.id])||null])), promedio, comentario });
      const pend = pendientes.find(p=>p.nombre.toLowerCase()===nuevaHamb.nombre.toLowerCase());
      if (pend) await db(`pendientes?id=eq.${pend.id}`,"DELETE");
      setNuevaHamb({ nombre:"", notas:"", precio:"", fecha:new Date().toISOString().split("T")[0] });
      setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); setComentario("");
      await cargarDatos(); setVista("ranking");
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const agregarMiPuntaje = async (hamb) => {
    const faltantes = CRITERIOS.filter(c=>!misPuntajes[c.id]);
    if (faltantes.length > 0) { setPuntajeIncompleto(true); return; }
    setLoading(true);
    try {
      const promedio = calcPromedio(misPuntajes);
      await db("puntajes","POST",{ hamburgueseria_id:hamb.id, jugador:usuario, ...Object.fromEntries(CRITERIOS.map(c=>[c.id,Number(misPuntajes[c.id])||null])), promedio, comentario });
      const presentes = [...(hamb.jugadores_presentes||[])];
      if (!presentes.includes(usuario)) presentes.push(usuario);
      const todosPuntajes = [...puntajesExistentes.filter(p=>p.hamburgueseria_id===hamb.id),{ promedio }];
      const proms = todosPuntajes.map(p=>Number(p.promedio)).filter(v=>v>0);
      const nuevoGlobal = proms.length?(proms.reduce((a,b)=>a+b,0)/proms.length).toFixed(1):null;
      await db(`hamburgueserias?id=eq.${hamb.id}`,"PATCH",{ jugadores_presentes:presentes, promedio_global:nuevoGlobal });
      setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); setComentario(""); setHambActual(null);
      await cargarDatos();
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const agregarPendiente = async () => { if (!nuevaPendiente.nombre.trim()) return; await db("pendientes","POST",{ nombre:nuevaPendiente.nombre, barrio:nuevaPendiente.barrio }); setNuevaPendiente({ nombre:"",barrio:"" }); await cargarDatos(); };
  const eliminarPendiente = async (id) => { await db(`pendientes?id=eq.${id}`,"DELETE"); await cargarDatos(); };

  if (!usuario || !aprobado) {
    if (loadingInit) return (<div style={{ ...s.root, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><style>{fonts}</style><div style={s.bg} /><div style={{ position:"relative", zIndex:1, textAlign:"center" }}><div style={{ fontSize:48, marginBottom:12 }}>🍔</div><p style={{ color:"#888" }}>Verificando acceso...</p></div></div>);
    return <PantallaAcceso onAcceso={onAcceso} />;
  }

  if (loadingInit) return (<div style={{ ...s.root, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}><style>{fonts}</style><div style={s.bg} /><div style={{ position:"relative", zIndex:1, textAlign:"center" }}><div style={{ fontSize:48, marginBottom:12 }}>🍔</div><p style={{ color:"#888" }}>Cargando el mundial...</p></div></div>);

  const ranking = [...hamburgueserias].sort((a,b)=>(b.promedio_global||0)-(a.promedio_global||0));
  const mejor = ranking[0];
  const getPuntajesHamb = id => puntajesExistentes.filter(p=>p.hamburgueseria_id===id);
  const yaPuntue = id => puntajesExistentes.some(p=>p.hamburgueseria_id===id&&p.jugador===usuario);
  const jugadorActual = jugadores.find(j=>j.nombre===usuario);

  return (
    <div style={s.root}>
      <style>{fonts}</style>
      <div style={s.bg} />
      {showRuleta && <Ruleta opciones={pendientes} onResultado={girarRuleta} onCerrar={cerrarRuleta} resultado={ruletaResultado} girando={ruletaGirando} />}
      {jugadorSeleccionado && <PopupIntegrante jugador={jugadorSeleccionado} puntajes={puntajesExistentes} hamburgueserias={hamburgueserias} onCerrar={()=>setJugadorSeleccionado(null)} />}

      <header style={s.header}>
        <div style={s.headerTop}>
          <span style={{ fontSize:32 }}>🍔</span>
          <div><h1 style={s.title}>HAMBRE</h1><p style={s.subtitle}>el mundial de las hamburgueserías</p></div>
          <span style={{ fontSize:32 }}>🔥</span>
        </div>
        {mejor && (<div style={s.mejorBanner}><span style={s.mejorLabel}>🏆 Mejor hasta ahora:</span><span style={s.mejorNombre}>{mejor.nombre}</span><span style={s.mejorPuntaje}>{mejor.promedio_global}</span></div>)}
        <p style={s.counter}>Hola, <strong>{usuario}</strong> {jugadorActual?.avatar_emoji||"👤"} · {hamburgueserias.length} visitada{hamburgueserias.length!==1?"s":""}</p>
      </header>

      <div style={s.sorteoBar}>
        <button style={s.sorteoBtn} onClick={()=>setShowRuleta(true)}>🎰 ¿A dónde vamos? ({pendientes.length} pendientes)</button>
      </div>

      <nav style={s.nav}>
        {[{id:"ranking",label:"🏆 Ranking"},{id:"nueva",label:"➕ Nueva"},{id:"pendientes",label:"📋 Lista"},{id:"jugadores",label:"👥 Equipo"}].filter(item=>ADMINS.includes(usuario)||item.id!=="pendientes").map(item=>(
          <button key={item.id} style={{ ...s.navBtn, ...(vista===item.id&&!hambActual?s.navBtnActive:{}) }}
            onClick={()=>{ setVista(item.id); setHambActual(null); setMisPuntajes(emptyScores()); setPuntajeIncompleto(false); }}>
            {item.label}
          </button>
        ))}
      </nav>

      <main style={s.main}>

        {/* RANKING CON PODIO */}
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
              <>
                {/* PODIO */}
                {ranking.length >= 1 && (
                  <div style={s.podioContainer}>
                    <p style={s.sectionTitle}>Tabla de posiciones</p>
                    <div style={s.podio}>
                      {/* 2do - solo si existe */}
                      {ranking.length >= 2 && (
                        <div style={s.podioItem} onClick={()=>{ setHambActual(ranking[1]); setMisPuntajes(emptyScores()); }}>
                          <div style={{ ...s.podioEmoji, fontSize:32 }}>🥈</div>
                          <div style={{ ...s.podioBox, height:80, background:"#f0f0f0" }}>
                            <p style={s.podioNombre}>{ranking[1].nombre}</p>
                            <p style={{ ...s.podioPuntaje, color:"#888" }}>{ranking[1].promedio_global}</p>
                          </div>
                        </div>
                      )}
                      {/* 1ro - siempre */}
                      <div style={s.podioItem} onClick={()=>{ setHambActual(ranking[0]); setMisPuntajes(emptyScores()); }}>
                        <div style={{ ...s.podioEmoji, fontSize:40 }}>🥇</div>
                        <div style={{ ...s.podioBox, height:110, background:`linear-gradient(135deg, #fff8e0, #fff3c0)`, border:`2px solid #FFD23F` }}>
                          <p style={s.podioNombre}>{ranking[0].nombre}</p>
                          <p style={{ ...s.podioPuntaje, color:ORANGE, fontSize:22 }}>{ranking[0].promedio_global}</p>
                        </div>
                      </div>
                      {/* 3ro - solo si existe */}
                      {ranking.length >= 3 && (
                        <div style={s.podioItem} onClick={()=>{ setHambActual(ranking[2]); setMisPuntajes(emptyScores()); }}>
                          <div style={{ ...s.podioEmoji, fontSize:28 }}>🥉</div>
                          <div style={{ ...s.podioBox, height:65, background:"#fdf5ee" }}>
                            <p style={s.podioNombre}>{ranking[2].nombre}</p>
                            <p style={{ ...s.podioPuntaje, color:"#cd7f32" }}>{ranking[2].promedio_global}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Lista completa */}
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
                          <div style={s.cardScore}><span style={s.scoreNum}>{h.promedio_global||"-"}</span><span style={s.scoreDen}>/10</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* DETALLE */}
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
              {CRITERIOS.map(c=>{ const pts=getPuntajesHamb(hambActual.id); const vals=pts.map(p=>Number(p[c.id])).filter(v=>v>0); const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"-"; return (<div key={c.id} style={s.criterioCard}><span style={{ fontSize:22 }}>{c.emoji}</span><span style={s.criterioLabel}>{c.label}</span><span style={s.criterioVal}>{avg}</span><FlameBar value={avg} size={10} /></div>); })}
            </div>
            <p style={s.sectionTitle}>Puntajes por persona</p>
            <div style={s.jugadoresTable}>
              {getPuntajesHamb(hambActual.id).map(p=>(
                <div key={p.id} style={{ ...s.jugadorRow, flexDirection:"column", alignItems:"flex-start", gap:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", width:"100%", alignItems:"center" }}>
                    <span style={s.jugadorNombre}>
                      {(() => { const j = jugadores.find(jj=>jj.nombre===p.jugador); return j?.avatar_emoji || "👤"; })()} {p.jugador}{p.jugador===usuario&&<span style={{ color:ORANGE, fontSize:11 }}> (vos)</span>}
                    </span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}><FlameBar value={p.promedio} size={12} /><span style={s.jugadorProm}>{p.promedio||"-"}</span></div>
                  </div>
                  {p.comentario && <p style={{ margin:0, fontSize:13, color:"#888", fontStyle:"italic", paddingLeft:4 }}>💬 "{p.comentario}"</p>}
                </div>
              ))}
            </div>
            {/* Quién falta votar */}
            {(() => { const yaVotaron = getPuntajesHamb(hambActual.id).map(p=>p.jugador); const faltan = jugadores.filter(j=>!yaVotaron.includes(j.nombre)); return faltan.length > 0 ? (
              <div style={{ background:"#fff8f3", border:`2px solid #FFE0CC`, borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
                <p style={{ margin:"0 0 6px", fontSize:11, letterSpacing:2, color:"#bbb", textTransform:"uppercase", fontWeight:700 }}>⏳ Falta votar</p>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {faltan.map(j=><span key={j.id} style={{ fontSize:13, background:"#f5f5f5", padding:"4px 10px", borderRadius:20, fontWeight:700 }}>{j.avatar_emoji||"👤"} {j.nombre}</span>)}
                </div>
              </div>
            ) : (
              <div style={{ background:"#e8f8f0", border:"2px solid #2ECC71", borderRadius:12, padding:"10px 14px", marginBottom:16 }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#27ae60" }}>✅ ¡Todos votaron!</p>
              </div>
            ); })()}
            {!yaPuntue(hambActual.id) && (
              <div style={s.miPuntajeBox}>
                <p style={{ ...s.sectionTitle, color:ORANGE, marginBottom:16 }}>⚡ Tu puntaje pendiente</p>
                {puntajeIncompleto&&<div style={s.alertaIncompleto}>⚠️ Completá <strong>todos</strong> los criterios para guardar</div>}
                <div style={s.criteriosGrid}>
                  {CRITERIOS.map(c=>{ const falta=puntajeIncompleto&&!misPuntajes[c.id]; return (<div key={c.id} style={{ ...s.criterioInput, ...(falta?{ background:"#fff0f0", borderRadius:10, padding:8 }:{}) }}><label style={{ ...s.criterioInputLabel, ...(falta?{ color:"#e55" }:{}) }}>{c.emoji} {c.label}{falta&&" ← ¡Falta!"}</label><div style={s.scoreButtons}>{[1,2,3,4,5,6,7,8,9,10].map(n=>{ const sel=Number(misPuntajes[c.id])===n; return <button key={n} style={{ ...s.scoreBtn, ...(sel?s.scoreBtnSel:{}) }} onClick={()=>{ setMisPuntajes(prev=>({...prev,[c.id]:n})); setPuntajeIncompleto(false); }}>{n}</button>; })}</div></div>); })}
                </div>
                <div style={s.formGroup}>
                  <label style={s.label}>Tu comentario (opcional)</label>
                  <input style={s.input} placeholder="Ej: El pan estaba increíble..." value={comentario} onChange={e=>setComentario(e.target.value)} />
                </div>
                <button style={{ ...s.btnPrimary, marginTop:8 }} onClick={()=>agregarMiPuntaje(hambActual)} disabled={loading}>{loading?"Guardando...":"Guardar mi puntaje 🔥"}</button>
              </div>
            )}
            <div style={s.promedioBox}><span style={s.promedioLabel}>Promedio global 🔥</span><span style={s.promedioVal}>{hambActual.promedio_global||"-"} / 10</span></div>
          </div>
        )}

        {/* NUEVA */}
        {vista==="nueva" && (
          <div>
            <p style={s.sectionTitle}>Nueva hamburguesería</p>
            {puntajeIncompleto&&<div style={s.alertaIncompleto}>⚠️ Completá <strong>todos</strong> los criterios para guardar</div>}
            <div style={s.formGroup}><label style={s.label}>Nombre del local</label><input style={s.input} placeholder="Ej: La Burguesía..." value={nuevaHamb.nombre} onChange={e=>setNuevaHamb(p=>({...p,nombre:e.target.value}))} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={s.formGroup}><label style={s.label}>Fecha</label><input style={s.input} type="date" value={nuevaHamb.fecha} onChange={e=>setNuevaHamb(p=>({...p,fecha:e.target.value}))} /></div>
              <div style={s.formGroup}><label style={s.label}>Precio promedio</label><input style={s.input} placeholder="Ej: 4500" value={nuevaHamb.precio} onChange={e=>setNuevaHamb(p=>({...p,precio:e.target.value}))} /></div>
            </div>
            <div style={s.formGroup}><label style={s.label}>Notas (opcional)</label><input style={s.input} placeholder="Ej: Pedimos la especial..." value={nuevaHamb.notas} onChange={e=>setNuevaHamb(p=>({...p,notas:e.target.value}))} /></div>
            <div style={s.jugadorSection}>
              <p style={s.jugadorSectionTitle}>👤 Tu puntaje ({usuario})</p>
              <div style={s.criteriosGrid}>
                {CRITERIOS.map(c=>{ const falta=puntajeIncompleto&&!misPuntajes[c.id]; return (<div key={c.id} style={{ ...s.criterioInput, ...(falta?{ background:"#fff0f0", borderRadius:10, padding:8 }:{}) }}><label style={{ ...s.criterioInputLabel, ...(falta?{ color:"#e55" }:{}) }}>{c.emoji} {c.label}{falta&&" ← ¡Falta!"}</label><div style={s.scoreButtons}>{[1,2,3,4,5,6,7,8,9,10].map(n=>{ const sel=Number(misPuntajes[c.id])===n; return <button key={n} style={{ ...s.scoreBtn, ...(sel?s.scoreBtnSel:{}) }} onClick={()=>{ setMisPuntajes(prev=>({...prev,[c.id]:n})); setPuntajeIncompleto(false); }}>{n}</button>; })}</div></div>); })}
              </div>
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Tu comentario (opcional)</label>
              <input style={s.input} placeholder="Ej: El pan estaba increíble, el medallón un poco seco..." value={comentario} onChange={e=>setComentario(e.target.value)} />
            </div>
            <button style={{ ...s.btnPrimary, opacity:nuevaHamb.nombre.trim()?1:0.5, marginTop:8 }} onClick={guardarHamb} disabled={loading}>{loading?"Guardando...":"¡Guardar resultado! 🔥"}</button>
          </div>
        )}

        {/* PENDIENTES - solo admin */}
        {vista==="pendientes" && (
          <div>
            <p style={s.sectionTitle}>Lista de pendientes</p>
            <button style={{ ...s.btnPrimary, marginBottom:20, fontSize:15 }} onClick={()=>setShowRuleta(true)}>🎰 Sortear próxima</button>
            <div style={s.formGroup}><label style={s.label}>Agregar hamburguesería</label><input style={s.input} placeholder="Nombre del local" value={nuevaPendiente.nombre} onChange={e=>setNuevaPendiente(p=>({...p,nombre:e.target.value}))} /></div>
            <div style={s.formGroup}><label style={s.label}>Barrio (opcional)</label><input style={s.input} placeholder="Ej: Palermo, Belgrano..." value={nuevaPendiente.barrio} onChange={e=>setNuevaPendiente(p=>({...p,barrio:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&agregarPendiente()} /></div>
            <button style={{ ...s.btnPrimary, opacity:nuevaPendiente.nombre.trim()?1:0.5, marginBottom:24 }} onClick={agregarPendiente}>Agregar a la lista</button>
            <div style={s.cards}>
              {pendientes.map(p=>(<div key={p.id} style={{ ...s.card, alignItems:"center" }}><span style={{ fontSize:22 }}>🍔</span><div style={s.cardBody}><p style={{ ...s.cardNombre, margin:0 }}>{p.nombre}</p>{p.barrio&&<p style={{ margin:"4px 0 0", fontSize:12, color:"#aaa" }}>📍 {p.barrio}</p>}</div><button style={{ background:"none", border:"none", color:"#ddd", fontSize:18, cursor:"pointer" }} onClick={()=>eliminarPendiente(p.id)}>✕</button></div>))}
              {pendientes.length===0&&<p style={{ color:"#bbb", textAlign:"center", padding:"32px 0" }}>No hay pendientes</p>}
            </div>
          </div>
        )}

        {/* EQUIPO */}
        {vista==="jugadores" && (
          <div>
            {/* Solicitudes - solo admin */}
            {ADMINS.includes(usuario) && solicitudes.length > 0 && (
              <div style={s.solicitudesBox}>
                <p style={{ ...s.sectionTitle, color:ORANGE }}>🔔 Solicitudes pendientes ({solicitudes.length})</p>
                {solicitudes.map(sol=>(<div key={sol.id} style={s.solicitudRow}><span style={s.solicitudNombre}>👤 {sol.nombre}</span><div style={{ display:"flex", gap:8 }}><button style={s.btnAceptar} onClick={()=>aprobarSolicitud(sol)}>✅ Aceptar</button><button style={s.btnRechazar} onClick={()=>rechazarSolicitud(sol)}>❌ Rechazar</button></div></div>))}
              </div>
            )}

            {/* Código - solo admin */}
            {ADMINS.includes(usuario) && (
              <div style={s.codigoBox}>
                <p style={s.codigoLabel}>🔐 Código de acceso</p>
                <p style={s.codigoValor}>HAMBRE-2025</p>
                <p style={s.codigoTexto}>Compartí este código con quien quieras sumar al mundial</p>
              </div>
            )}

            <p style={s.sectionTitle}>El equipo</p>

            {/* Mi perfil con foto */}
            <div style={s.miPerfilBox}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={s.avatarCircle} onClick={()=>setShowEmojiPicker(true)}>
                  {jugadorActual?.avatar_emoji ? (
                    <span style={{ fontSize:36 }}>{jugadorActual.avatar_emoji}</span>
                  ) : (
                    <span style={{ fontSize:24 }}>😊</span>
                  )}
                </div>
                <div>
                  <p style={{ margin:0, fontSize:18, fontWeight:800, color:"#222" }}>{usuario} <span style={{ color:ORANGE }}>(vos)</span></p>
                  {jugadorActual?.apodo && <p style={{ margin:"2px 0 0", fontSize:13, color:ORANGE, fontWeight:700 }}>{jugadorActual.apodo}</p>}
                  {jugadorActual?.descripcion_avatar && <p style={{ margin:"4px 0 0", fontSize:11, color:"#aaa" }}>{jugadorActual.descripcion_avatar}</p>}
                  <button style={{ ...s.btnFoto, marginTop:8 }} onClick={()=>setShowEmojiPicker(true)}>
                    {jugadorActual?.avatar_emoji ? "Cambiar emoji" : "Elegir emoji 😊"}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista del equipo */}
            <div style={s.jugadoresList}>
              {jugadores.filter(j=>j.nombre!==usuario).map(j=>{
                const susPuntajes = puntajesExistentes.filter(p=>p.jugador===j.nombre);
                const promedio = susPuntajes.length ? (susPuntajes.map(p=>Number(p.promedio)).filter(v=>v>0).reduce((a,b)=>a+b,0)/susPuntajes.filter(p=>Number(p.promedio)>0).length).toFixed(1) : null;
                return (
                  <div key={j.id} style={s.jugadorChip} onClick={()=>setJugadorSeleccionado(j)}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ ...s.avatarCircleSmall }}>
                        {j.avatar_url ? (
                          <img src={j.avatar_url} style={{ width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover" }} alt="avatar" />
                        ) : j.avatar_emoji ? (
                          <span style={{ fontSize:22 }}>{j.avatar_emoji}</span>
                        ) : (
                          <span style={{ fontSize:18 }}>👤</span>
                        )}
                      </div>
                      <div>
                        <p style={{ margin:0, fontSize:15, fontWeight:700 }}>{j.nombre}</p>
                        {j.apodo && <p style={{ margin:0, fontSize:12, color:ORANGE }}>{j.apodo}</p>}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      {promedio && <span style={{ fontSize:18, fontWeight:800, color:ORANGE }}>{promedio}</span>}
                      <p style={{ margin:0, fontSize:11, color:"#bbb" }}>ver puntajes →</p>
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
                <div style={{ background:"#fff", borderRadius:20, padding:24, width:"100%", maxWidth:340 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <p style={{ margin:0, fontSize:16, fontWeight:800 }}>Elegí tu emoji</p>
                    <button style={{ background:"none", border:"none", fontSize:20, cursor:"pointer" }} onClick={()=>setShowEmojiPicker(false)}>✕</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8 }}>
                    {["😎","🤠","👻","🤖","🦁","🐯","🦊","🐸","🐙","🦄","🍔","🌮","🍕","🌭","🍟","🥪","🎩","👑","🎭","🔥","⚡","🌈","💪","🏆","🎯","🎲","🚀","💎","🦸","🥷"].map(e=>(
                      <div key={e} style={{ background:"#f5f5f5", borderRadius:10, padding:8, fontSize:24, cursor:"pointer", textAlign:"center", userSelect:"none" }} onPointerUp={()=>elegirEmoji(e)}>{e}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <button style={{ ...s.btnPrimary, background:"#f5f5f5", color:"#aaa", boxShadow:"none", marginTop:8 }}
              onClick={()=>{ localStorage.removeItem("hambre_usuario"); setUsuario(""); setAprobado(false); }}>
              Cambiar mi nombre
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
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
  title:{ margin:0, fontSize:40, fontFamily:"'Manrope',sans-serif", fontWeight:800, color:"#fff", letterSpacing:4, lineHeight:1, textShadow:"2px 3px 0 rgba(0,0,0,0.15)" },
  subtitle:{ margin:"2px 0 0", fontSize:11, color:"rgba(255,255,255,0.85)", letterSpacing:2, textTransform:"uppercase" },
  counter:{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,0.8)" },
  mejorBanner:{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"rgba(255,255,255,0.15)", borderRadius:12, padding:"6px 14px", margin:"8px auto 4px", maxWidth:340, flexWrap:"wrap" },
  mejorLabel:{ fontSize:11, color:"rgba(255,255,255,0.8)" },
  mejorNombre:{ fontSize:14, fontWeight:800, color:"#fff" },
  mejorPuntaje:{ fontSize:16, fontWeight:800, color:"#FFD23F" },
  sorteoBar:{ position:"relative", zIndex:1, padding:"10px 16px", background:"#fff", borderBottom:"1px solid #f0e8e0" },
  sorteoBtn:{ width:"100%", padding:"12px", background:`linear-gradient(135deg, #1a0a00, #2d1500)`, border:`2px solid ${ORANGE}`, borderRadius:12, color:ORANGE, fontSize:15, fontWeight:800, cursor:"pointer", fontFamily:"'Manrope',sans-serif", letterSpacing:1 },
  nav:{ position:"relative", zIndex:1, display:"flex", background:"#fff", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" },
  navBtn:{ flex:1, padding:"12px 4px", background:"none", border:"none", color:"#bbb", fontSize:12, cursor:"pointer", fontFamily:"'Manrope',sans-serif", fontWeight:700, whiteSpace:"nowrap" },
  navBtnActive:{ color:ORANGE, borderBottom:`3px solid ${ORANGE}`, background:"#fff8f3" },
  main:{ position:"relative", zIndex:1, maxWidth:600, margin:"0 auto", padding:"20px 16px 80px" },
  empty:{ textAlign:"center", padding:"48px 20px" },
  emptyTitle:{ fontSize:20, fontWeight:800, color:"#333", margin:"12px 0 8px" },
  emptyText:{ fontSize:14, color:"#aaa", marginBottom:24 },
  podioContainer:{ marginBottom:20 },
  podio:{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:8, marginBottom:20 },
  podioItem:{ display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer", flex:1, maxWidth:120 },
  podioEmoji:{ marginBottom:4 },
  podioBox:{ width:"100%", borderRadius:12, padding:"10px 6px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", border:"2px solid #eee", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" },
  podioNombre:{ margin:0, fontSize:11, fontWeight:800, color:"#333", textAlign:"center", lineHeight:1.2 },
  podioPuntaje:{ margin:"4px 0 0", fontSize:18, fontWeight:800 },
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
  scoreNum:{ fontSize:24, fontWeight:800, color:ORANGE },
  scoreDen:{ fontSize:11, color:"#bbb", display:"block" },
  back:{ background:"none", border:"none", color:ORANGE, fontSize:14, cursor:"pointer", padding:"0 0 16px", fontFamily:"'Manrope',sans-serif", fontWeight:700 },
  detalleHeader:{ marginBottom:20 },
  detalleNombre:{ fontSize:24, fontWeight:800, color:"#222", margin:"0 0 6px" },
  detalleMeta:{ fontSize:12, color:"#aaa", background:"#f5f5f5", padding:"3px 10px", borderRadius:20 },
  detalleNotas:{ fontSize:13, color:"#888", fontStyle:"italic", margin:"8px 0 0" },
  detalleGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 },
  criterioCard:{ background:"#fff", borderRadius:14, padding:"12px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  criterioLabel:{ fontSize:10, color:"#aaa", textAlign:"center" },
  criterioVal:{ fontSize:20, fontWeight:800, color:ORANGE },
  sectionTitle:{ fontSize:12, letterSpacing:2, color:"#bbb", textTransform:"uppercase", margin:"0 0 14px", fontWeight:700 },
  jugadoresTable:{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 },
  jugadorRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", borderRadius:12, padding:"12px 16px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)" },
  jugadorNombre:{ fontSize:15, fontWeight:700 },
  jugadorProm:{ fontSize:20, fontWeight:800, color:ORANGE },
  miPuntajeBox:{ background:"#fff8f3", border:`2px solid ${ORANGE}`, borderRadius:16, padding:"16px", marginBottom:16 },
  promedioBox:{ display:"flex", justifyContent:"space-between", alignItems:"center", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, borderRadius:16, padding:"18px 20px", marginTop:16 },
  promedioLabel:{ fontSize:13, color:"rgba(255,255,255,0.9)", fontWeight:700 },
  promedioVal:{ fontSize:28, fontWeight:800, color:"#fff" },
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
  jugadoresList:{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 },
  jugadorChip:{ background:"#fff", borderRadius:14, padding:"14px 16px", fontWeight:700, boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"2px solid transparent", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" },
  solicitudesBox:{ background:"#fff8f3", border:`2px solid ${ORANGE}`, borderRadius:16, padding:"16px", marginBottom:20 },
  solicitudRow:{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 },
  solicitudNombre:{ fontSize:15, fontWeight:700 },
  btnAceptar:{ background:"#e8f8f0", border:"2px solid #2ECC71", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", fontWeight:700, color:"#27ae60", fontFamily:"'Manrope',sans-serif" },
  btnRechazar:{ background:"#fff0f0", border:"2px solid #ffaaaa", borderRadius:8, padding:"6px 12px", fontSize:13, cursor:"pointer", fontWeight:700, color:"#e55", fontFamily:"'Manrope',sans-serif" },
  codigoBox:{ background:`linear-gradient(135deg, #1a0a00, #2d1500)`, border:`2px solid ${ORANGE}`, borderRadius:16, padding:"16px 20px", marginBottom:20, textAlign:"center" },
  codigoLabel:{ fontSize:11, letterSpacing:2, color:"#a8956a", textTransform:"uppercase", margin:"0 0 8px", fontWeight:700 },
  codigoValor:{ fontSize:28, fontWeight:800, color:ORANGE, letterSpacing:4, margin:"0 0 6px" },
  codigoTexto:{ fontSize:12, color:"#666", margin:0 },
  miPerfilBox:{ background:"#fff", borderRadius:16, padding:"16px", marginBottom:20, boxShadow:"0 2px 10px rgba(0,0,0,0.06)", border:`2px solid #eee` },
  avatarCircle:{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg, ${ORANGE}, ${PINK})`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative", flexShrink:0, boxShadow:"0 4px 12px rgba(255,107,43,0.3)" },
  avatarCircleSmall:{ width:48, height:48, borderRadius:"50%", background:`linear-gradient(135deg, #f5f5f5, #eee)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  btnFoto:{ background:"none", border:`2px solid ${ORANGE}`, borderRadius:8, padding:"5px 12px", fontSize:12, cursor:"pointer", color:ORANGE, fontFamily:"'Manrope',sans-serif", fontWeight:700 },
};
