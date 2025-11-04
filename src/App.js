import React, {useState, useEffect} from 'react';
import PptxGenJS from 'pptxgenjs';
import logo from './logo.svg';

const DEFAULT_ITEMS = [
  'Notebook',
  'Impressora',
  'Cabo carregador',
  'Leitor 2D',
  'Base do leitor 2D',
  'Cabo do leitor 2D',
  'Windscanner'
];

function makeBench(i){
  const items = {};
  DEFAULT_ITEMS.forEach(it=>items[it]='ok');
  return {
    id: `B-${String(i+1).padStart(3,'0')}`,
    name: `Bancada ${i+1}`,
    zone: 'Geral',
    category: 'Padrão',
    items,
    note: '',
    photoDataUrl: null
  };
}

export default function App(){
  const [benches, setBenches] = useState(()=>{ const a=[]; for(let i=0;i<70;i++) a.push(makeBench(i)); return a; });
  const [selected, setSelected] = useState(benches[0]?.id || null);
  const [filter, setFilter] = useState('');
  const [showOnlyProblems, setShowOnlyProblems] = useState(false);

  useEffect(()=>{ if(!selected && benches.length) setSelected(benches[0].id); },[benches,selected]);

  function updateBench(id, patch){
    setBenches(prev=>prev.map(b=> b.id===id ? {...b,...patch} : b));
  }
  function updateItemStatus(id,item,status){
    setBenches(prev=>prev.map(b=> b.id===id ? {...b, items:{...b.items,[item]:status}} : b));
  }

  function handlePhotoUpload(benchId, file){
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e=>{
      const dataUrl = e.target.result;
      updateBench(benchId, { photoDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function hasProblem(b){ return DEFAULT_ITEMS.some(it=> b.items[it] !== 'ok'); }
  function missingItems(b){ return DEFAULT_ITEMS.filter(it=> b.items[it] !== 'ok'); }

  function generatePPTX(){
    const pptx = new PptxGenJS();
    pptx.author = 'Ronda Operacional';
    pptx.title = 'Ronda Operacional';
    const list = benches.filter(b=>{
      if(showOnlyProblems && !hasProblem(b)) return false;
      if(!filter) return true;
      const q = filter.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.zone.toLowerCase().includes(q);
    });

    // cover slide
    const cover = pptx.addSlide();
    cover.addText('Ronda Operacional — Relatório Semanal', {x:0.5,y:0.4,fontSize:24,bold:true,color:'000000'});
    cover.addText(`Total bancadas: ${benches.length}`, {x:0.5,y:1.1,fontSize:14});
    cover.addText(`Incluídas: ${list.length}`, {x:0.5,y:1.4,fontSize:14});
    // logo top-right
    cover.addImage({data: logo, x:7.3, y:0.15, w:2.2, h:0.6});

    list.forEach((b, idx)=>{
      const slide = pptx.addSlide();
      // background color band
      slide.addShape(pptx.ShapeType.rect, {x:0,y:0,w:10,h:0.9,fill:{color:'FFE600'}});
      slide.addText(`${b.name} — ${b.id}`, {x:0.3,y:0.1,fontSize:18,bold:true,color:'000000'});
      // logo
      slide.addImage({data: logo, x:8.2, y:0.05, w:1.6, h:0.5});
      // summary
      const problems = missingItems(b);
      const summary = problems.length ? `Faltando: ${problems.join(', ')}` : 'Tudo OK';
      slide.addText(summary, {x:0.3,y:1.1,fontSize:12});
      // checklist
      const bullets = DEFAULT_ITEMS.map(it=> `• ${it}: ${b.items[it]}`);
      slide.addText(bullets.join('\n'), {x:0.3,y:1.6,fontSize:12,lineSpacing:14});
      // note
      if(b.note) slide.addText(`Observação: ${b.note}`, {x:0.3,y:5.5,fontSize:10,color:'333333'});

      // photo if exists
      if(b.photoDataUrl){
        // scale and place right side
        slide.addImage({data: b.photoDataUrl, x:6.2, y:1.6, w:3.2, h:2.4});
      }

      slide.addText(`Slide ${idx+1} / ${list.length}`, {x:8.2,y:7.0,fontSize:9});
    });

    pptx.writeFile({ fileName: `ronda_operacional_${new Date().toISOString().slice(0,10)}.pptx` });
  }

  function exportCsv(){
    const rows = benches.map(b=>{
      const itemPart = DEFAULT_ITEMS.map(it=>`${it}:${b.items[it]}`).join(';');
      const photo = b.photoDataUrl ? 'inline' : '';
      return [b.id,b.name,b.zone,b.category,b.note,photo,itemPart].join(',');
    });
    const blob = new Blob([rows.join('\n')], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download='ronda_bancadas.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function importCsv(file){
    const reader = new FileReader();
    reader.onload = e=>{
      const text = e.target.result;
      const rows = text.split(/\r?\n/).filter(Boolean);
      const parsed = rows.map(r=>{
        const cols = r.split(',');
        const id = cols[0] || `B-${Math.random().toString(36).slice(2,7)}`;
        const name = cols[1] || id;
        const zone = cols[2] || 'Geral';
        const category = cols[3] || 'Padrão';
        const note = cols[4] || '';
        const photoMarker = cols[5] || '';
        const itemPart = cols.slice(6).join(',');
        const items = {};
        DEFAULT_ITEMS.forEach(it=>items[it]='nao_aplic');
        if(itemPart){
          itemPart.split(';').forEach(pair=>{
            const [k,v] = pair.split(':').map(s=>s && s.trim());
            if(k && items.hasOwnProperty(k)) items[k]=v||'ok';
          });
        }
        return {id,name,zone,category,note,items,photoDataUrl: null};
      });
      setBenches(parsed);
    };
    reader.readAsText(file);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Ronda Operacional</h1>
        <img src={logo} alt="logo" className="logo"/>
      </div>

      <div className="controls" style={{marginTop:12}}>
        <input placeholder="Filtrar por id/nome/zone..." value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
        <label className="small"><input type="checkbox" checked={showOnlyProblems} onChange={e=>setShowOnlyProblems(e.target.checked)} /> Mostrar apenas problemas</label>
        <button className="btn btn-primary" onClick={generatePPTX}>Gerar PPTX</button>
        <input type="file" accept=".csv" onChange={e=>e.target.files && importCsv(e.target.files[0])}/>
        <button className="btn" onClick={exportCsv}>Exportar CSV</button>
      </div>

      <div className="container">
        <div className="sidebar">
          <div className="small">Total: {benches.length} — Visíveis: {benches.filter(b=>{
            if(showOnlyProblems && !hasProblem(b)) return false;
            if(!filter) return true;
            const q = filter.toLowerCase();
            return b.id.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.zone.toLowerCase().includes(q);
          }).length}</div>
          <div style={{marginTop:8}}>
            {benches.filter(b=>{
              if(showOnlyProblems && !hasProblem(b)) return false;
              if(!filter) return true;
              const q = filter.toLowerCase();
              return b.id.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.zone.toLowerCase().includes(q);
            }).map(b=>(
              <div key={b.id} className="bench-item" onClick={()=>setSelected(b.id)} style={{background:selected===b.id ? '#f0f8ff':'transparent'}}>
                <div>
                  <div style={{fontWeight:600}}>{b.name}</div>
                  <div className="small">{b.id} • {b.zone}</div>
                </div>
                <div>{hasProblem(b) ? <span className="status-bad">⚠️</span> : <span className="status-ok">✓</span>}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="main">
          {selected ? (()=>{ const bench = benches.find(x=>x.id===selected); if(!bench) return <div>Selecione uma bancada.</div>; return (
            <div>
              <h2 style={{marginTop:0}}>{bench.name} — {bench.id}</h2>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input value={bench.zone} onChange={e=>updateBench(bench.id,{zone:e.target.value})} style={{padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
                <input value={bench.category} onChange={e=>updateBench(bench.id,{category:e.target.value})} style={{padding:8,borderRadius:6,border:'1px solid #ccc'}}/>
                <input className="note" value={bench.note} onChange={e=>updateBench(bench.id,{note:e.target.value})} placeholder="Observação (opcional)"/>
              </div>

              <div className="grid">
                {DEFAULT_ITEMS.map(it=>(
                  <div key={it} className="item-card">
                    <div style={{fontWeight:600,marginBottom:6}}>{it}</div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <label><input type="radio" name={`${bench.id}-${it}`} checked={bench.items[it]==='ok'} onChange={()=>updateItemStatus(bench.id,it,'ok')} /> OK</label>
                      <label><input type="radio" name={`${bench.id}-${it}`} checked={bench.items[it]==='faltando'} onChange={()=>updateItemStatus(bench.id,it,'faltando')} /> Faltando</label>
                      <label><input type="radio" name={`${bench.id}-${it}`} checked={bench.items[it]==='nao_aplic'} onChange={()=>updateItemStatus(bench.id,it,'nao_aplic')} /> N/A</label>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}>
                <label className="small">Foto (opcional):</label>
                <input type="file" accept="image/*" onChange={e=>e.target.files && handlePhotoUpload(bench.id, e.target.files[0])}/>
                {bench.photoDataUrl ? <img src={bench.photoDataUrl} alt="foto" style={{height:60,borderRadius:6,objectFit:'cover'}}/> : <div className="small">Nenhuma foto anexada</div>}
              </div>

              <div style={{marginTop:12,display:'flex',gap:8}}>
                <button className="btn btn-yellow" onClick={()=>updateBench(bench.id,{items:DEFAULT_ITEMS.reduce((acc,it)=>{acc[it]='ok';return acc;},{})})}>Marcar todos OK</button>
                <button className="btn" onClick={()=>updateBench(bench.id,{items:DEFAULT_ITEMS.reduce((acc,it)=>{acc[it]='faltando';return acc;},{})})}>Marcar todos FALTANDO</button>
                <button className="btn" onClick={()=>{ if(window.confirm(`Remover ${bench.name}?`)){ setBenches(prev=>prev.filter(x=>x.id!==bench.id)); setSelected(null); } }}>Remover bancada</button>
              </div>
            </div>
          );})() : <div>Selecione uma bancada na lista à esquerda.</div>}
        </div>
      </div>

      <div className="footer">
        Dica: marque apenas o que precisa. Fotos anexadas aparecem automaticamente nos slides.
      </div>
    </div>
  );
}
