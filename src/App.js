import { useState, useEffect } from "react";
import { getRecipes, addRecipe, deleteRecipe } from "./lib/supabase";
import "./App.css";

// ── CONSTANTS ────────────────────────────────────────────
const FOOD_TYPES    = ["Principal","Entrante","Ensalada","Sopa","Postre","Desayuno","Snack"];
const BASES         = ["Pasta","Arroz","Legumbre","Hoja verde","Pan/Tortilla","Caldo","Masa","Carne","Pescado"];
const CUISINES      = ["Italiana","Mexicana","Mediterránea","Asiática","Americana","Española","Francesa","India"];
const SOURCES       = ["Manual","PDF","Web","Texto PDF"];
const DAYS          = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

// ── MACRO BAR ────────────────────────────────────────────
function MacroBar({ protein, carbs, fat }) {
  const total = (protein || 0) + (carbs || 0) + (fat || 0) || 1;
  return (
    <div>
      <div className="macro-bar">
        <div className="macro-bar-p" style={{ width: `${(protein / total) * 100}%` }} />
        <div className="macro-bar-c" style={{ width: `${(carbs  / total) * 100}%` }} />
        <div className="macro-bar-f" style={{ width: `${(fat    / total) * 100}%` }} />
      </div>
      <div className="macro-legend">
        <span><span className="macro-dot" style={{background:"#B85C2C"}}/>P: {protein}g</span>
        <span><span className="macro-dot" style={{background:"#C4963A"}}/>C: {carbs}g</span>
        <span><span className="macro-dot" style={{background:"#5C7A5C"}}/>G: {fat}g</span>
      </div>
    </div>
  );
}

// ── RECIPE CARD ──────────────────────────────────────────
function RecipeCard({ recipe, onClick, onDelete }) {
  return (
    <div className="recipe-card" onClick={() => onClick(recipe)}>
      <div className={`card-banner ${recipe.cuisine?.toLowerCase().split("/")[0].trim()}`} />
      <div className="card-body">
        <div className="card-meta">
          <div>
            <div className="card-title">{recipe.name}</div>
            <div className="card-origin">📍 {recipe.origin || "—"}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="card-calories">{recipe.calories}<span> kcal</span></div>
          </div>
        </div>
        <div className="card-tags">
          {recipe.type   && <span className="tag tag-type">{recipe.type}</span>}
          {recipe.base   && <span className="tag tag-base">{recipe.base}</span>}
          {recipe.source && <span className="tag tag-source">{recipe.source}</span>}
        </div>
        <MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
        <button className="btn-delete" onClick={e => { e.stopPropagation(); onDelete(recipe.id); }}>🗑</button>
      </div>
    </div>
  );
}

// ── RECIPE MODAL ─────────────────────────────────────────
function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps       = Array.isArray(recipe.steps)       ? recipe.steps       : [];
  const tags        = Array.isArray(recipe.tags)        ? recipe.tags        : [];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{recipe.name}</div>
            <div style={{fontSize:13,color:"var(--warm-gray)",marginTop:4}}>
              📍 {recipe.origin} · {recipe.cuisine}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="macro-cards">
            {[["calories","Calorías",recipe.calories,""],["protein","Proteína",recipe.protein,"g"],
              ["carbs","Carbohidratos",recipe.carbs,"g"],["fat","Grasas",recipe.fat,"g"]].map(([cls,lbl,val,unit])=>(
              <div key={cls} className={`macro-card ${cls}`}>
                <div className="macro-card-value">{val}{unit}</div>
                <div className="macro-card-label">{lbl}</div>
              </div>
            ))}
          </div>
          {ingredients.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">Ingredientes</div>
              <ul className="ingredients-list">
                {ingredients.map((ing, i) => <li key={i} className="ingredient-item">{ing}</li>)}
              </ul>
            </div>
          )}
          {steps.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">Preparación</div>
              <ol className="steps-list">
                {steps.map((step, i) => (
                  <li key={i} className="step-item">
                    <div className="step-num">{i+1}</div>
                    <div className="step-text">{step}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {tags.length > 0 && (
            <div className="card-tags">
              {tags.map(t => <span key={t} className="tag tag-type">#{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



// ── ADD RECIPE ───────────────────────────────────────────
function AddRecipe({ onAdd }) {
  const [inputMode, setInputMode] = useState("manual");
  const [loading,   setLoading]   = useState(false);
  const [aiMsg,     setAiMsg]     = useState("");
  const [urlValue,  setUrlValue]  = useState("");
  const [pdfText,   setPdfText]   = useState("");
  const [bulkProgress, setBulkProgress] = useState(null); // {done, total}
  const [success,   setSuccess]   = useState(false);
  const emptyForm = {
    name:"", origin:"", cuisine:"", type:"", base:"", main_ingredient:"",
    calories:"", protein:"", carbs:"", fat:"", source:"Manual",
    ingredients:"", steps:"", tags:""
  };
  const [form, setForm] = useState(emptyForm);
  const setF = (k,v) => setForm(f => ({...f, [k]:v}));

  async function callAI(prompt, systemPrompt) {
    const sys = systemPrompt || `Eres un asistente culinario experto. Responde SOLO en JSON válido, sin markdown ni texto extra.
Estructura exacta: {"name":"","origin":"","cuisine":"","type":"","base":"","main_ingredient":"","calories":0,"protein":0,"carbs":0,"fat":0,"ingredients":[],"steps":[],"tags":[]}`;
    const res = await fetch("https://subgcucynbjrhnkpsfjh.supabase.co/functions/v1/claude-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1000,
        system: sys,
        messages: [{ role:"user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.map(b => b.text||"").join("") || "";
  }

  async function handleSingleAI(prompt) {
    setLoading(true); setAiMsg("");
    try {
      const text = await callAI(prompt);
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      setForm({
        name: parsed.name||"", origin: parsed.origin||"", cuisine: parsed.cuisine||"",
        type: parsed.type||"", base: parsed.base||"", main_ingredient: parsed.main_ingredient||"",
        calories: parsed.calories||"", protein: parsed.protein||"",
        carbs: parsed.carbs||"", fat: parsed.fat||"",
        source: inputMode==="url"?"Web":"Manual",
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients.join("\n") : "",
        steps:       Array.isArray(parsed.steps)       ? parsed.steps.join("\n")       : "",
        tags:        Array.isArray(parsed.tags)        ? parsed.tags.join(", ")        : ""
      });
      setAiMsg("✓ Datos extraídos. Revisa y ajusta si es necesario.");
    } catch {
      setAiMsg("No se pudo procesar. Rellena el formulario manualmente.");
    }
    setLoading(false);
  }

  // ── BULK: extrae lista de recetas del texto, luego las procesa una a una
  async function handleBulkImport() {
    if (!pdfText.trim()) return;
    setLoading(true); setAiMsg(""); setBulkProgress(null);

    try {
      // Paso 1: pedir a la IA que liste los nombres de todas las recetas
      const listText = await callAI(
        `Del siguiente texto de un plan nutricional, extrae SOLO los nombres de todas las recetas que aparecen. Responde SOLO con un array JSON de strings, sin markdown. Ejemplo: ["Receta 1","Receta 2"]\n\nTEXTO:\n${pdfText.slice(0,8000)}`,
        `Eres un extractor de datos. Responde SOLO con JSON válido, sin markdown ni texto extra.`
      );
      const names = JSON.parse(listText.replace(/```json|```/g,"").trim());
      if (!Array.isArray(names) || names.length === 0) throw new Error("No se encontraron recetas");

      setBulkProgress({ done: 0, total: names.length });

      // Paso 2: procesar cada receta del texto
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        try {
          const text = await callAI(
            `Del siguiente texto, extrae la receta completa de "${name}". Incluye ingredientes reales del texto y estima los macros nutricionales.\n\nTEXTO:\n${pdfText.slice(0,8000)}`
          );
          const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
          const recipe = {
            name: parsed.name || name,
            origin: parsed.origin || "",
            cuisine: parsed.cuisine || "Española",
            type: parsed.type || "Principal",
            base: parsed.base || "",
            main_ingredient: parsed.main_ingredient || "",
            calories: parseInt(parsed.calories) || 0,
            protein:  parseInt(parsed.protein)  || 0,
            carbs:    parseInt(parsed.carbs)    || 0,
            fat:      parseInt(parsed.fat)      || 0,
            source: "PDF",
            ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
            steps:       Array.isArray(parsed.steps)       ? parsed.steps       : [],
            tags:        Array.isArray(parsed.tags)        ? parsed.tags        : []
          };
          await onAdd(recipe, true); // true = silencioso, no redirigir
        } catch { /* si falla una, seguimos con la siguiente */ }
        setBulkProgress({ done: i + 1, total: names.length });
      }

      setAiMsg(`✅ ${names.length} recetas importadas correctamente.`);
      setPdfText("");
    } catch (e) {
      setAiMsg("Error al procesar el texto. Asegúrate de haber pegado el texto completo.");
    }
    setLoading(false);
    setBulkProgress(null);
  }

  async function handleSave() {
    if (!form.name) return;
    const recipe = {
      ...form,
      calories: parseInt(form.calories)||0,
      protein:  parseInt(form.protein)||0,
      carbs:    parseInt(form.carbs)||0,
      fat:      parseInt(form.fat)||0,
      ingredients: form.ingredients.split("\n").filter(Boolean),
      steps:       form.steps.split("\n").filter(Boolean),
      tags:        form.tags.split(",").map(t=>t.trim()).filter(Boolean)
    };
    await onAdd(recipe);
    setSuccess(true);
    setForm(emptyForm);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="add-form">
      <div className="form-title">Añadir Receta</div>
      <div className="form-subtitle">Importa desde texto de PDF, URL o añade manualmente.</div>

      <div className="input-sources" style={{gridTemplateColumns:"repeat(3,1fr)"}}>
        {[{key:"manual",icon:"✍️",label:"Manual",desc:"Rellena el formulario"},
          {key:"pdf",   icon:"📋",label:"Pegar texto PDF",desc:"Copia el texto del PDF aquí"},
          {key:"url",   icon:"🌐",label:"Desde Web",desc:"Pega una URL"}
        ].map(s => (
          <button key={s.key} className={`source-btn ${inputMode===s.key?"active":""}`} onClick={()=>setInputMode(s.key)}>
            <div className="source-btn-icon">{s.icon}</div>
            <div className="source-btn-label">{s.label}</div>
            <div className="source-btn-desc">{s.desc}</div>
          </button>
        ))}
      </div>

      {/* ── MODO PDF: pegar texto ── */}
      {inputMode==="pdf" && (
        <div className="form-section">
          <div className="ai-hint-box">
            📋 <strong>Cómo usarlo:</strong> Abre tu PDF → selecciona todo el texto (<strong>Ctrl+A</strong>) → cópialo (<strong>Ctrl+C</strong>) → pégalo aquí abajo (<strong>Ctrl+V</strong>). La IA extraerá todas las recetas automáticamente.
          </div>
          <label className="form-label">Texto del PDF</label>
          <textarea
            className="form-input form-textarea"
            style={{minHeight:180}}
            placeholder="Pega aquí el texto copiado de tu PDF..."
            value={pdfText}
            onChange={e=>setPdfText(e.target.value)}
          />
          {bulkProgress && (
            <div style={{margin:"12px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--warm-gray)",marginBottom:6}}>
                <span>Importando recetas...</span>
                <span>{bulkProgress.done} / {bulkProgress.total}</span>
              </div>
              <div style={{height:6,background:"#E8E3DB",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",background:"var(--rust)",borderRadius:3,width:`${(bulkProgress.done/bulkProgress.total)*100}%`,transition:"width .3s"}}/>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:12,alignItems:"center",marginTop:12,flexWrap:"wrap"}}>
            <button className="btn-ai" onClick={handleBulkImport} disabled={loading||!pdfText.trim()}>
              {loading ? <><div className="spinner"/>Procesando...</> : <>🤖 Importar todas las recetas con IA</>}
            </button>
          </div>
          {aiMsg && <div className="success-badge" style={{marginTop:10}}>{aiMsg}</div>}
        </div>
      )}

      {/* ── MODO URL ── */}
      {inputMode==="url" && (
        <div className="form-section">
          <label className="form-label">URL de la receta</label>
          <div className="url-input-row">
            <input className="form-input" placeholder="https://..." value={urlValue} onChange={e=>setUrlValue(e.target.value)}/>
            <button className="btn-fetch" onClick={()=>handleSingleAI(`Extrae la receta de esta URL: ${urlValue}`)} disabled={loading}>
              {loading ? <div className="spinner"/> : "Extraer con IA"}
            </button>
          </div>
          {aiMsg && <div className="success-badge" style={{marginTop:10}}>{aiMsg}</div>}
        </div>
      )}

      {/* ── MODO MANUAL ── */}
      {inputMode==="manual" && (
        <div className="ai-hint-box">
          🤖 <strong>Tip:</strong> Escribe solo el nombre y pulsa <em>"Completar con IA"</em> para que se rellene automáticamente.
        </div>
      )}

      {/* ── FORMULARIO (manual y url) ── */}
      {(inputMode==="manual" || inputMode==="url") && (
        <div className="form-section">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" placeholder="Ej: Lasaña boloñesa" value={form.name} onChange={e=>setF("name",e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Origen</label>
              <input className="form-input" placeholder="Ej: Bolonia, Italia" value={form.origin} onChange={e=>setF("origin",e.target.value)}/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cocina</label>
              <select className="form-input form-select" value={form.cuisine} onChange={e=>setF("cuisine",e.target.value)}>
                <option value="">Selecciona...</option>
                {CUISINES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de plato</label>
              <select className="form-input form-select" value={form.type} onChange={e=>setF("type",e.target.value)}>
                <option value="">Selecciona...</option>
                {FOOD_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Base del plato</label>
              <select className="form-input form-select" value={form.base} onChange={e=>setF("base",e.target.value)}>
                <option value="">Selecciona...</option>
                {BASES.map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ingrediente principal</label>
              <input className="form-input" placeholder="Ej: Pollo, Tofu..." value={form.main_ingredient} onChange={e=>setF("main_ingredient",e.target.value)}/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
            {[["calories","Calorías"],["protein","Proteínas (g)"],["carbs","Carbohidratos (g)"],["fat","Grasas (g)"]].map(([k,l])=>(
              <div key={k} className="form-group" style={{marginBottom:0}}>
                <label className="form-label">{l}</label>
                <input className="form-input" type="number" placeholder="0" value={form[k]} onChange={e=>setF(k,e.target.value)}/>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Ingredientes (uno por línea)</label>
            <textarea className="form-input form-textarea" placeholder={"200g pasta\n2 huevos\n..."} value={form.ingredients} onChange={e=>setF("ingredients",e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Pasos de preparación (uno por línea)</label>
            <textarea className="form-input form-textarea" placeholder={"Cocer la pasta\nPreparar la salsa..."} value={form.steps} onChange={e=>setF("steps",e.target.value)}/>
          </div>
          <div className="form-group">
            <label className="form-label">Etiquetas (separadas por comas)</label>
            <input className="form-input" placeholder="rápida, vegana, sin gluten..." value={form.tags} onChange={e=>setF("tags",e.target.value)}/>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
            {inputMode==="manual" && (
              <button className="btn-ai" onClick={()=>form.name&&handleSingleAI(`Genera receta completa para "${form.name}"${form.origin?` de ${form.origin}`:""}`)} disabled={loading||!form.name}>
                {loading ? <><div className="spinner"/>Procesando...</> : <>🤖 Completar con IA</>}
              </button>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={!form.name}>Guardar Receta</button>
            {success && <div className="success-badge">✅ Guardada en la base de datos</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── WEEKLY MENU ──────────────────────────────────────────
function WeeklyMenu({ recipes }) {
  const [prefs, setPrefs] = useState({
    dailyCal: 1800, cuisine: "", diet: "",
    proteinPct: 30, carbsPct: 40, fatPct: 30
  });
  const [menu,    setMenu]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");

  const setP = (k,v) => setPrefs(p => ({...p,[k]:v}));

  // Ensure macros always sum to 100
  const handleMacro = (k, v) => {
    const val = Math.min(100, Math.max(0, parseInt(v)||0));
    if (k==="proteinPct") { const rem = 100-val; setPrefs(p=>({...p,proteinPct:val,carbsPct:Math.round(rem*p.carbsPct/(p.carbsPct+p.fatPct)||rem/2),fatPct:Math.round(rem*p.fatPct/(p.carbsPct+p.fatPct)||rem/2)})); }
    else if (k==="carbsPct") { const rem = 100-val; setPrefs(p=>({...p,carbsPct:val,proteinPct:Math.round(rem*p.proteinPct/(p.proteinPct+p.fatPct)||rem/2),fatPct:Math.round(rem*p.fatPct/(p.proteinPct+p.fatPct)||rem/2)})); }
    else { const rem = 100-val; setPrefs(p=>({...p,fatPct:val,proteinPct:Math.round(rem*p.proteinPct/(p.proteinPct+p.carbsPct)||rem/2),carbsPct:Math.round(rem*p.carbsPct/(p.proteinPct+p.carbsPct)||rem/2)})); }
  };

  async function generateMenu() {
    setLoading(true); setErr(""); setMenu(null);
    const names = recipes.map(r=>`${r.name} (${r.calories}kcal, ${r.type})`).join(", ");
    const proteinG = Math.round((prefs.dailyCal * prefs.proteinPct/100) / 4);
    const carbsG   = Math.round((prefs.dailyCal * prefs.carbsPct/100)   / 4);
    const fatG     = Math.round((prefs.dailyCal * prefs.fatPct/100)     / 9);
    try {
      const res = await fetch("https://subgcucynbjrhnkpsfjh.supabase.co/functions/v1/claude-proxy", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1YmdjdWN5bmJqcmhua3BzZmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTE5MzIsImV4cCI6MjA5NjQyNzkzMn0.nQf2cGp04qbUYGFAQ1WCFKrWCtfPCxa-QzlpuIudidE",
        },
        body: JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:1500,
          system:`Eres nutricionista experto. Responde SOLO en JSON válido, sin markdown.
Estructura exacta (7 días, 4 comidas por día):
{"days":[{"day":"Lun","breakfast":"nombre","lunch":"nombre","snack":"nombre","dinner":"nombre","totalCal":0,"totalProtein":0,"totalCarbs":0,"totalFat":0},...]}`,
          messages:[{role:"user",content:`Crea un menú semanal de 7 días con 4 comidas diarias (desayuno, comida, snack y cena).
Calorías totales diarias: ${prefs.dailyCal} kcal.
Distribución de macros: ${prefs.proteinPct}% proteína (~${proteinG}g), ${prefs.carbsPct}% carbohidratos (~${carbsG}g), ${prefs.fatPct}% grasas (~${fatG}g).
${prefs.cuisine?`Estilo de cocina: ${prefs.cuisine}.`:""}
${prefs.diet?`Tipo de dieta: ${prefs.diet}.`:""}
${names?`Recetas disponibles en la base de datos: ${names}.`:""}`}]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b=>b.text||"").join("")||"";
      setMenu(JSON.parse(text.replace(/```json|```/g,"").trim()));
    } catch {
      setErr("No se pudo generar el menú. Inténtalo de nuevo.");
    }
    setLoading(false);
  }

  const totalCal = menu?.days?.reduce((s,d)=>s+(d.totalCal||0),0)||0;
  const avgProtein = menu?.days ? Math.round(menu.days.reduce((s,d)=>s+(d.totalProtein||0),0)/7) : 0;
  const avgCarbs   = menu?.days ? Math.round(menu.days.reduce((s,d)=>s+(d.totalCarbs||0),0)/7)   : 0;
  const avgFat     = menu?.days ? Math.round(menu.days.reduce((s,d)=>s+(d.totalFat||0),0)/7)     : 0;

  return (
    <div className="menu-generator">
      <div className="form-title">Menú Semanal con IA</div>
      <div className="form-subtitle">4 comidas al día ajustadas a tus calorías y macros.</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
        {/* Calorías diarias */}
        <div className="menu-option-card">
          <div className="menu-option-label">CALORÍAS TOTALES / DÍA</div>
          <input className="form-input" type="number" value={prefs.dailyCal} onChange={e=>setP("dailyCal",e.target.value)}/>
          <div style={{fontSize:11,color:"var(--warm-gray)",marginTop:4}}>
            Desayuno ~{Math.round(prefs.dailyCal*0.25)}kcal · Comida ~{Math.round(prefs.dailyCal*0.35)}kcal · Snack ~{Math.round(prefs.dailyCal*0.15)}kcal · Cena ~{Math.round(prefs.dailyCal*0.25)}kcal
          </div>
        </div>

        {/* Dieta y cocina */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div className="menu-option-card" style={{padding:"10px 14px"}}>
            <div className="menu-option-label">TIPO DE DIETA</div>
            <select className="form-input form-select" value={prefs.diet} onChange={e=>setP("diet",e.target.value)}>
              <option value="">Sin restricciones</option>
              <option>Vegetariana</option><option>Vegana</option>
              <option>Sin gluten</option><option>Mediterránea</option>
              <option>Alta en proteínas</option>
            </select>
          </div>
          <div className="menu-option-card" style={{padding:"10px 14px"}}>
            <div className="menu-option-label">ESTILO DE COCINA</div>
            <select className="form-input form-select" value={prefs.cuisine} onChange={e=>setP("cuisine",e.target.value)}>
              <option value="">Variado</option>
              {CUISINES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Distribución de macros */}
      <div className="menu-option-card" style={{marginBottom:20}}>
        <div className="menu-option-label" style={{marginBottom:12}}>DISTRIBUCIÓN DE MACROS</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {[
            ["proteinPct","Proteína %","#B85C2C", Math.round((prefs.dailyCal*prefs.proteinPct/100)/4)+"g"],
            ["carbsPct","Carbohidratos %","#C4963A", Math.round((prefs.dailyCal*prefs.carbsPct/100)/4)+"g"],
            ["fatPct","Grasas %","#5C7A5C", Math.round((prefs.dailyCal*prefs.fatPct/100)/9)+"g"]
          ].map(([k,lbl,color,grams])=>(
            <div key={k}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"var(--warm-gray)"}}>{lbl}</span>
                <span style={{color,fontWeight:600}}>{prefs[k]}% · {grams}</span>
              </div>
              <input type="range" className="slider" min="10" max="70" value={prefs[k]}
                style={{"--val":`${((prefs[k]-10)/60)*100}%`, accentColor:color}}
                onChange={e=>handleMacro(k,e.target.value)}/>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,height:8,borderRadius:4,overflow:"hidden",display:"flex",gap:2}}>
          <div style={{background:"#B85C2C",width:`${prefs.proteinPct}%`,transition:"width .3s"}}/>
          <div style={{background:"#C4963A",width:`${prefs.carbsPct}%`,transition:"width .3s"}}/>
          <div style={{background:"#5C7A5C",width:`${prefs.fatPct}%`,transition:"width .3s"}}/>
        </div>
        <div style={{display:"flex",gap:16,fontSize:11,color:"var(--warm-gray)",marginTop:6}}>
          <span><span className="macro-dot" style={{background:"#B85C2C"}}/>Proteína {prefs.proteinPct}%</span>
          <span><span className="macro-dot" style={{background:"#C4963A"}}/>Carbos {prefs.carbsPct}%</span>
          <span><span className="macro-dot" style={{background:"#5C7A5C"}}/>Grasas {prefs.fatPct}%</span>
          <span style={{marginLeft:"auto",fontWeight:600,color: Math.abs(prefs.proteinPct+prefs.carbsPct+prefs.fatPct-100)>2?"var(--rust)":"var(--sage)"}}>
            Total: {prefs.proteinPct+prefs.carbsPct+prefs.fatPct}%
          </span>
        </div>
      </div>

      <button className="btn-ai" onClick={generateMenu} disabled={loading}>
        {loading ? <><div className="spinner"/>Generando menú...</> : <>✨ Generar Menú con IA</>}
      </button>
      {err && <div style={{color:"var(--rust)",marginTop:12,fontSize:13}}>{err}</div>}

      {menu && (
        <div style={{marginTop:24}}>
          <div className="week-grid">
            {menu.days?.map((day,i)=>(
              <div key={i} className="day-column">
                <div className="day-header">{day.day}</div>
                {[["🌅","Desayuno",day.breakfast],["🍽️","Comida",day.lunch],["🍎","Snack",day.snack],["🌙","Cena",day.dinner]].map(([icon,tipo,nombre])=>(
                  <div key={tipo} className="day-meal">
                    <div className="day-meal-type">{icon} {tipo}</div>
                    <div className="day-meal-name">{nombre}</div>
                  </div>
                ))}
                <div style={{fontSize:10,color:"var(--rust)",textAlign:"center",marginTop:4,fontWeight:600}}>
                  {day.totalCal} kcal
                </div>
                <div style={{fontSize:9,color:"var(--warm-gray)",textAlign:"center"}}>
                  P:{day.totalProtein}g C:{day.totalCarbs}g G:{day.totalFat}g
                </div>
              </div>
            ))}
          </div>
          <div className="menu-total-row">
            <div className="menu-total-item"><div className="menu-total-value">{Math.round(totalCal/7)}</div><div className="menu-total-label">kcal promedio/día</div></div>
            <div className="menu-total-item"><div className="menu-total-value">{avgProtein}g</div><div className="menu-total-label">proteína/día</div></div>
            <div className="menu-total-item"><div className="menu-total-value">{avgCarbs}g</div><div className="menu-total-label">carbos/día</div></div>
            <div className="menu-total-item"><div className="menu-total-value">{avgFat}g</div><div className="menu-total-label">grasas/día</div></div>
            <div className="menu-total-item"><div className="menu-total-value">28</div><div className="menu-total-label">comidas planificadas</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [tab,      setTab]      = useState("recipes");
  const [recipes,  setRecipes]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters,  setFilters]  = useState({ search:"", type:"", base:"", cuisine:"", source:"", maxCal:2000 });

  useEffect(() => {
    getRecipes().then(data => { setRecipes(data||[]); setLoading(false); })
                .catch(()  => setLoading(false));
  }, []);

  const setF = (k,v) => setFilters(f=>({...f,[k]:v}));
  const toggleFilter = (k,v) => setF(k, filters[k]===v ? "" : v);

  const filtered = recipes.filter(r => {
    const search = filters.search.toLowerCase();
    if (search && !r.name?.toLowerCase().includes(search) &&
        !(r.ingredients||[]).join(" ").toLowerCase().includes(search) &&
        !r.main_ingredient?.toLowerCase().includes(search)) return false;
    if (filters.type    && r.type    !== filters.type)    return false;
    if (filters.base    && r.base    !== filters.base)    return false;
    if (filters.cuisine && r.cuisine !== filters.cuisine) return false;
    if (filters.source  && r.source  !== filters.source)  return false;
    if ((r.calories||0) > filters.maxCal) return false;
    return true;
  });

  async function handleAdd(recipe, silent = false) {
    const saved = await addRecipe(recipe);
    setRecipes(prev => [saved, ...prev]);
    if (!silent) setTab("recipes");
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar esta receta?")) return;
    await deleteRecipe(id);
    setRecipes(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="header-title">Receta<span>Base</span></div>
          <div className="header-subtitle">Base de datos culinaria con IA</div>
        </div>
        <nav className="nav-tabs">
          {[["recipes","📚 Recetas"],["add","➕ Añadir"],["menu","📅 Menú Semanal"]].map(([k,l])=>(
            <button key={k} className={`nav-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </nav>
      </header>

      <div className="main">
        {tab==="recipes" && (
          <>
            <aside className="sidebar">
              <div className="filter-section">
                <div className="filter-label">Buscar</div>
                <input className="filter-input" placeholder="Nombre o ingrediente..." value={filters.search} onChange={e=>setF("search",e.target.value)}/>
              </div>
              {[["Tipo de plato","type",FOOD_TYPES],["Base","base",BASES],["Cocina","cuisine",CUISINES],["Fuente","source",SOURCES]].map(([lbl,key,opts])=>(
                <div key={key} className="filter-section">
                  <div className="filter-label">{lbl}</div>
                  <div className="filter-chips">
                    {opts.map(o=>(
                      <button key={o} className={`chip ${filters[key]===o?"active":""}`} onClick={()=>toggleFilter(key,o)}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="filter-section">
                <div className="filter-label">Calorías máx.</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--warm-gray)",marginBottom:4}}>
                  <span>0</span><span style={{color:"var(--rust)",fontWeight:600}}>{filters.maxCal} kcal</span>
                </div>
                <input type="range" className="slider" min="100" max="2000" step="50" value={filters.maxCal}
                  style={{"--val":`${((filters.maxCal-100)/1900)*100}%`}}
                  onChange={e=>setF("maxCal",parseInt(e.target.value))}/>
              </div>
              {Object.values(filters).some(v=>v&&v!==2000) && (
                <button className="chip" style={{width:"100%",textAlign:"center",borderColor:"var(--rust)",color:"var(--rust)"}}
                  onClick={()=>setFilters({search:"",type:"",base:"",cuisine:"",source:"",maxCal:2000})}>
                  ✕ Limpiar filtros
                </button>
              )}
            </aside>
            <div className="content">
              <div className="section-header">
                <div className="section-title">Recetas</div>
                <div className="section-count">{filtered.length} encontradas</div>
              </div>
              {loading ? (
                <div className="empty-state"><div className="empty-state-icon">⏳</div><div>Cargando recetas...</div></div>
              ) : filtered.length===0 ? (
                <div className="empty-state"><div className="empty-state-icon">🍽️</div><div>No hay recetas. ¡Añade la primera!</div></div>
              ) : (
                <div className="recipe-grid">
                  {filtered.map(r=><RecipeCard key={r.id} recipe={r} onClick={setSelected} onDelete={handleDelete}/>)}
                </div>
              )}
            </div>
          </>
        )}
        {tab==="add"    && <div className="content"><AddRecipe onAdd={handleAdd}/></div>}
        {tab==="menu"   && <div className="content"><WeeklyMenu recipes={recipes}/></div>}
      </div>
      {selected && <RecipeModal recipe={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}
