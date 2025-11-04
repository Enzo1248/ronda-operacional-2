import React, {useState, useEffect, useRef} from 'react';
import PptxGenJS from 'pptxgenjs';
import logo from "./logo.svg";
import coverImg from '../public/cover.png';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ITEMS = ['Notebook','Impressora','Cabo carregador','Leitor 2D','Base do leitor 2D','Cabo do leitor 2D','Ring Scanner (RFIN)'];
const STATUSES = [{ key: 'operacional', label: 'Operacional', color: '2ecc71' },{ key: 'intermitente', label: 'Intermitente', color: 'f1c40f' },{ key: 'inoperante', label: 'Inoperante', color: 'e74c3c' },{ key: 'ausente', label: 'Ausente', color: '2d3436' }];

function makeBench(i){ const items = {}; ITEMS.forEach(it=>items[it] = { status: 'operacional', note: '' }); return { id: `Packing Mono ${i+1}`, name: `Packing Mono ${i+1}`, photo: null, items }; }

export default function App(){
  const [benches, setBenches] = useState(()=>{ const a=[]; for(let i=0;i<65;i++) a.push(makeBench(i)); return a; });
  const [selected, setSelected] = useState(benches[0]?.id || null);
  const [filter, setFilter] = useState('');
  const [dateStr, setDateStr] = useState(new Date().toLocaleDateString('pt-BR'));
  const contentRef = useRef();

  useEffect(()=>{ if(!selected && benches.length) setSelected(benches[0].id); },[benches,selected]);

  function updateBench(id, patch){ setBenches(prev=>prev.map(b=> b.id===id ? {...b,...patch} : b)); }
  function updateItem(benchId, itemKey, patch){ setBenches(prev=>prev.map(b=> { if(b.id!==benchId) return b; return { ...b, items: { ...b.items, [itemKey]: { ...b.items[itemKey], ...patch } } }; })); }
  function handlePhotoUpload(benchId, file){ if(!file) return; const reader = new FileReader(); reader.onload = e=>{ updateBench(benchId, { photo: e.target.result }); }; reader.readAsDataURL(file); }

  function generatePPTX(){
    const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE';
    const cover = pptx.addSlide(); cover.addImage({ data: coverImg, x:0, y:0, w:10, h:5.63 }); cover.addText('Ronda Operacional - Mercado Livre', { x:0.5, y:0.8, fontSize:28, color:'000000', bold:true }); cover.addText(dateStr, { x:0.5, y:1.3, fontSize:12, color:'666666' }); cover.addImage({ data: logo, x:8.0, y:0.15, w:1.8, h:0.5 });
    const slide = pptx.addSlide(); slide.addText('Ronda Operacional - Resumo', { x:0.3, y:0.2, fontSize:18, bold:true, color:'000000' }); slide.addText(dateStr, { x:8.0, y:0.2, fontSize:10, color:'666666' }); slide.addImage({ data: logo, x:8.0, y:0.1, w:1.2, h:0.35 });
    const colWidth = 4.6; let x = 0.3, y = 0.6;
    benches.forEach((b, idx)=>{ const col = idx % 2; x = 0.3 + col * colWidth; if(col === 0 && idx !== 0 && idx % 2 === 0){ y += 1.1; } const boxY = y; slide.addText(`${b.name}`, { x:x, y:boxY, fontSize:10, bold:true, color:'000000' }); const lines = ITEMS.map(it=>{ const st = b.items[it].status; const note = b.items[it].note ? ` - ${b.items[it].note}` : ''; return `${it}: ${st}${note}`; }); slide.addText(lines.join('\n'), { x:x, y:boxY+0.18, fontSize:8, color:'000000', lineSpacing:10, w:4.2 }); if(b.photo){ slide.addImage({ data: b.photo, x:x+3.2, y:boxY+0.0, w:0.9, h:0.6 }); } });
    pptx.writeFile({ fileName: `ronda_operacional_${new Date().toISOString().slice(0,10)}.pptx` });
  }

  async function generatePDF(){ const el = contentRef.current; if(!el) return; const canvas = await html2canvas(el, { scale: 2 }); const imgData = canvas.toDataURL('image/png'); const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width, canvas.height] }); pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height); pdf.save(`ronda_operacional_${new Date().toISOString().slice(0,10)}.pdf`); }

  const visible = benches.filter(b=>{ if(!filter) return true; const q = filter.toLowerCase(); return b.name.toLowerCase().includes(q); });

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>Ronda Operacional - Mercado Livre</h1>
          <div className="small">Data da ronda: <input type="date" value={new Date(dateStr).toISOString().slice(0,10)} onChange={e=>setDateStr(new Date(e.target.value).toLocaleDateString('pt-BR'))} /></div>
        </div>
        <img src={logo} alt="logo" style={{height:48}}/>
      </div>

      <div className="controls" style={{marginTop:12, display:'flex', gap:8, alignItems:'center'}}>
        <input placeholder="Filtrar por bancada..." value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
        <button className="btn btn-primary" onClick={generatePPTX}>Gerar PPTX</button>
        <button className="btn" onClick={generatePDF}>Gerar PDF</button>
      </div>

      <div className="container" style={{marginTop:12}}>
        <div className="sidebar">
          <div className="small" style={{marginBottom:8}}>Total bancadas: {benches.length} — Visíveis: {visible.length}</div>
          <div>
            {visible.map(b=>(
              <div key={b.id} className="bench-item" onClick={()=>setSelected(b.id)} style={{background:selected===b.id ? '#f0f8ff':'transparent'}}>
                <div><div style={{fontWeight:600}}>{b.name}</div></div>
                <div style={{fontSize:12}}>{b.photo ? '📷' : ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="main">
          {selected ? (()=>{ const bench = benches.find(x=>x.id===selected); if(!bench) return <div>Selecione uma bancada.</div>; return (
            <div>
              <h2 style={{marginTop:0}}>{bench.name}</h2>
              <div style={{display:'flex',gap:8,marginBottom:12, alignItems:'center'}}>
                <label className="small">Foto (opcional):</label>
                <input type="file" accept="image/*" onChange={e=>e.target.files && handlePhotoUpload(bench.id, e.target.files[0])}/>
                {bench.photo ? <img src={bench.photo} alt="foto" style={{height:80,borderRadius:6,objectFit:'cover'}}/> : <div className="small">Nenhuma foto</div>}
              </div>

              <div className="grid">
                {ITEMS.map(it=>(
                  <div key={it} className="item-card">
                    <div style={{fontWeight:600,marginBottom:6}}>{it}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6}}>
                      {STATUSES.map(s=>(<label key={s.key}><input type="radio" name={`${bench.id}-${it}`} checked={bench.items[it].status===s.key} onChange={()=>updateItem(bench.id,it,{status:s.key})}/> {s.label} </label>))}
                    </div>
                    <textarea className="note" placeholder="Observação por item" value={bench.items[it].note} onChange={e=>updateItem(bench.id,it,{note:e.target.value})}></textarea>
                  </div>
                ))}
              </div>

            </div>
          );})() : <div>Selecione uma bancada.</div>}
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div className="small" style={{marginBottom:6}}>Visualização antes da exportação (esta área será convertida em PDF/PPTX):</div>
        <div ref={contentRef} style={{padding:12,background:'#fff',borderRadius:6,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div><div style={{fontSize:20,fontWeight:700}}>Ronda Operacional - Mercado Livre</div><div style={{color:'#666'}}>{dateStr}</div></div>
            <img src={logo} alt="logo" style={{height:48}}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}}>
            {benches.map((b, idx)=>(
              <div key={b.id} className="card-small">
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{b.name}</div>
                  <div style={{fontSize:12,marginTop:4}}>
                    {ITEMS.map(it=>{ const st = b.items[it].status; const note = b.items[it].note; return <div key={it} style={{marginBottom:2}}><strong>{it}:</strong> {STATUSES.find(s=>s.key===st).label}{note ? ` — ${note}` : ''}</div> })}
                  </div>
                </div>
                <div>{b.photo ? <img src={b.photo} alt="foto"/> : <div style={{width:64,height:48,background:'#f0f0f0',display:'flex',alignItems:'center',justifyContent:'center',color:'#888'}}>No Photo</div>}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      <div className="footer">Dica: preencha os status e observações, anexe fotos quando necessário e clique em Gerar PPTX ou Gerar PDF.</div>
    </div>
  );
}
