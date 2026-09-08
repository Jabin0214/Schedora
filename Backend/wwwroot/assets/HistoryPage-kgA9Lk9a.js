import{a as D,j as e}from"./index-DR0AUPeh.js";import{b as d}from"./react-DFz_G5ct.js";import{l as c,w as K,n as q,y as Q,B as j,o as le,aa as de,I as ce,q as pe,r as ge,S as xe,s as ue,E as he,K as J,u as R,T as P,H as fe,N as me,O as ye,g as ke}from"./antd-BxGu6vwH.js";import{i as be}from"./isoWeek-C_c8oyHh.js";import{A as T,E as ve}from"./api-NnPq0-qX.js";import{h as Y}from"./errorHandler-CFv0Uufw.js";import{I as we}from"./shared-Cgyp3jzZ.js";import{u as Se}from"./useInspectionTypes-v-WPhp9Q.js";c.extend(be);const{RangePicker:je}=Q,A=ve.parkingReceipts,I={fontSize:"12px",letterSpacing:"0.2px"},$e=(p,f)=>{let r=0,m=p.startOf("day");const C=f.startOf("day");for(;!m.isAfter(C);){const w=m.day();w!==0&&w!==6&&r++,m=m.add(1,"day")}return r},Ce=p=>p===0||p===1?2:1,$=p=>p.workUnits??Ce(p.type),O=({label:p,value:f,sub:r})=>e.jsxs("div",{style:{flex:1,minWidth:130,background:"#FFFFFF",border:"1px solid #E9E9E7",borderRadius:6,padding:"12px 16px"},children:[e.jsx("div",{style:{fontSize:"11px",color:"#55534e",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:500,marginBottom:6},children:p}),e.jsx("div",{style:{fontSize:"24px",fontWeight:700,color:"#37352F",lineHeight:1},children:f}),r&&e.jsx("div",{style:{fontSize:"12px",color:"#787774",marginTop:5},children:r})]}),Ae=()=>{const{getType:p,types:f}=Se(),[r,m]=d.useState([]),[C,w]=d.useState(!1),[V,W]=d.useState(!1),[u,M]=d.useState(null),[l,y]=d.useState(null),[b,X]=d.useState([c().subtract(13,"day"),c()]),[v,H]=d.useState(""),[U,N]=d.useState([]),[_,B]=d.useState(!1),Z=d.useMemo(()=>f.map(t=>({value:t.id,label:t.name})),[f]),ee=v.trim()?U:r;d.useEffect(()=>{const t=v.trim();if(!t){N([]);return}const s=setTimeout(async()=>{B(!0);try{const o=await D.get(T.inspectionRecords,{params:{address:t}});N(o.data)}catch(o){Y(o,"Failed to search")}finally{B(!1)}},400);return()=>clearTimeout(s)},[v]);const z=d.useCallback(async()=>{w(!0);try{const[t,s]=b,o=await D.get(T.inspectionRecords,{params:{startDate:t.startOf("day").toISOString(),endDate:s.endOf("day").toISOString()}});m(o.data)}catch(t){Y(t,"Failed to fetch history")}finally{w(!1)}},[b]);d.useEffect(()=>{z()},[z]);const k=d.useMemo(()=>{const[t,s]=b,o=$e(t,s),a=o,i=r.reduce((g,S)=>g+$(S),0),h=r.reduce((g,S)=>g+(S.parkingFee??0),0);return{workdays:o,officeHours:a,workUnits:i,totalParking:h}},[b,r]),te=d.useCallback(t=>{M(t.id),y({executionDate:c(t.executionDate),type:t.type,isCharged:t.isCharged,workUnits:$(t),parkingFee:t.parkingFee??null})},[]),E=d.useCallback(()=>{M(null),y(null)},[]),se=d.useCallback(async t=>{if(l){W(!0);try{await D.put(`${T.inspectionRecords}/${t.id}`,{executionDate:l.executionDate.toISOString(),type:l.type,isCharged:l.isCharged,workUnits:l.workUnits,parkingFee:l.parkingFee??null}),m(s=>s.map(o=>o.id===t.id?{...o,executionDate:l.executionDate.toISOString(),type:l.type,isCharged:l.isCharged,workUnits:l.workUnits,parkingFee:l.parkingFee??void 0}:o)),K.success("Record updated"),E()}catch(s){Y(s,"Failed to update record")}finally{W(!1)}}},[l,E]),ae=[{title:"Date",key:"date",width:170,render:(t,s)=>u===s.id?e.jsx(Q,{value:l.executionDate,onChange:a=>a&&y(i=>i&&{...i,executionDate:a}),showTime:!0,format:"YYYY-MM-DD HH:mm",size:"small",style:{width:155},onClick:a=>a.stopPropagation()}):e.jsx("span",{style:{color:"#2383E2",fontSize:"13px",fontWeight:500,letterSpacing:"0.2px"},children:c(s.executionDate).format("YYYY-MM-DD HH:mm")})},{title:"Address",key:"address",ellipsis:{showTitle:!1},render:(t,s)=>e.jsx(J,{title:s.propertyAddress,children:e.jsx("span",{style:{color:"#37352F",fontWeight:600,fontSize:"14px"},children:s.propertyAddress||"-"})})},{title:"Type",key:"type",width:130,render:(t,s)=>{if(u===s.id)return e.jsx(R,{value:l.type,onChange:i=>y(h=>h&&{...h,type:i}),options:Z,size:"small",style:{width:110},onClick:i=>i.stopPropagation()});const a=p(s.type);return a?e.jsx(P,{color:a.color,style:I,children:a.name}):e.jsx("span",{style:{color:"#E03E3E",fontSize:"12px"},children:String(s.type)})}},{title:"Charged",key:"charge",width:110,render:(t,s)=>u===s.id?e.jsx(R,{value:l.isCharged,onChange:a=>y(i=>i&&{...i,isCharged:a}),options:[{value:!0,label:"Charged"},{value:!1,label:"Free"}],size:"small",style:{width:90},onClick:a=>a.stopPropagation()}):e.jsx(P,{color:s.isCharged?"gold":"green",style:I,children:s.isCharged?"Charged":"Free"})},{title:"Units",key:"workUnits",width:95,render:(t,s)=>u===s.id?e.jsx(R,{value:l.workUnits,onChange:a=>y(i=>i&&{...i,workUnits:a}),options:[{value:1,label:"1x"},{value:2,label:"2x"}],size:"small",style:{width:70},onClick:a=>a.stopPropagation()}):e.jsxs(P,{color:$(s)===2?"blue":"default",style:I,children:[$(s),"x"]})},{title:"Parking",key:"parking",width:110,render:(t,s)=>u===s.id?e.jsx(fe,{value:l.parkingFee,onChange:a=>y(i=>i&&{...i,parkingFee:a}),min:0,precision:2,prefix:"$",placeholder:"0.00",size:"small",style:{width:90},onClick:a=>a.stopPropagation()}):s.parkingFee!=null&&s.parkingFee>0?e.jsxs("span",{style:{color:"#37352F",fontSize:"13px",fontWeight:500},children:["$",s.parkingFee.toFixed(2)]}):e.jsx("span",{style:{color:"#ACABA9",fontSize:"13px"},children:"—"})},{title:"",key:"actions",width:80,render:(t,s)=>u===s.id?e.jsxs(q,{size:4,onClick:a=>a.stopPropagation(),children:[e.jsx(j,{size:"small",type:"primary",icon:e.jsx(me,{}),loading:V,onClick:()=>se(s),"aria-label":"Save record"}),e.jsx(j,{size:"small",icon:e.jsx(ye,{}),onClick:E,"aria-label":"Cancel edit"})]}):e.jsx(J,{title:"Copy",children:e.jsx(j,{size:"small",icon:e.jsx(ke,{}),"aria-label":"Copy record",onClick:a=>{a.stopPropagation();const i=`${c(s.executionDate).format("DMMMYYYY")}:${s.propertyAddress??""}`;navigator.clipboard.writeText(i),K.success("Copied")}})})}],ie=()=>{const[t,s]=b,o=`${t.format("D MMM YYYY")} – ${s.format("D MMM YYYY")}`,a=c().format("D MMM YYYY, HH:mm"),i=n=>{const x=f.find(re=>re.id===n);return x?x.name:String(n)},h={};let g=0;for(const n of r){const x=i(n.type);h[x]=(h[x]??0)+1,n.parkingFee&&(g+=n.parkingFee)}const{workdays:S,officeHours:L,workUnits:G}=k,oe=r.slice().sort((n,x)=>c(n.executionDate).valueOf()-c(x.executionDate).valueOf()).map((n,x)=>`
        <tr>
          <td class="num">${x+1}</td>
          <td class="mono">${c(n.executionDate).format("DD MMM YYYY")}</td>
          <td class="mono dim">${c(n.executionDate).format("HH:mm")}</td>
          <td>${n.propertyAddress??"-"}</td>
          <td class="center">${i(n.type)}</td>
          <td class="center">${n.isCharged?"Charged":"Free"}</td>
          <td class="center">${$(n)}x</td>
          <td class="center">${n.parkingFee!=null&&n.parkingFee>0?"$"+n.parkingFee.toFixed(2):"—"}</td>
        </tr>`).join(""),ne=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Work Report – ${o}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 32px 40px; }
    h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .meta { font-size: 11px; color: #444; margin-bottom: 20px; }

    /* Summary boxes */
    .summary-grid { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat-box { flex: 1; border: 1px solid #ccc; border-radius: 4px; padding: 10px 14px; }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px; }
    .stat-value { font-size: 20px; font-weight: bold; }
    .stat-sub { font-size: 9px; color: #888; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    th { font-size: 10px; font-weight: bold; text-align: left; padding: 5px 8px;
         border-top: 2px solid #000; border-bottom: 1px solid #000; }
    td { padding: 5px 8px; border-bottom: 1px solid #ccc; font-size: 11px; vertical-align: top; }
    .num { width: 28px; text-align: right; color: #666; }
    .center { text-align: center; }
    .mono { font-family: monospace; }
    .dim { color: #666; }

    .receipts { margin-bottom: 16px; font-size: 10px; color: #555; padding: 7px 10px; border: 1px solid #ccc; border-left: 3px solid #555; border-radius: 2px; }
    .footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print { @page { size: A4; margin: 15mm; } }
  </style>
</head>
<body>
  <h1>Work Report</h1>
  <div class="meta">Period: ${o} &nbsp;&nbsp; Generated: ${a}</div>

  ${g>0?`<div class="receipts">Parking receipts (Google Drive): <a href="${A}">${A}</a></div>`:""}

  <div class="summary-grid">
    <div class="stat-box">
      <div class="stat-label">Inspections</div>
      <div class="stat-value">${r.length}</div>
      <div class="stat-sub">Work units: ${G} · ${Object.entries(h).map(([n,x])=>`${n}: ${x}`).join(" · ")}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Office Hours</div>
      <div class="stat-value">${L} hrs</div>
      <div class="stat-sub">${S} workdays × 1 hr/day</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Parking Fees</div>
      <div class="stat-value">${g>0?"$"+g.toFixed(2):"—"}</div>
      <div class="stat-sub">${g>0?"Receipts in Google Drive":"No parking charges"}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Date</th>
        <th>Time</th>
        <th>Property Address</th>
        <th class="center">Type</th>
        <th class="center">Charge</th>
        <th class="center">Units</th>
        <th class="center">Parking</th>
      </tr>
    </thead>
    <tbody>
      ${oe||'<tr><td colspan="8" style="text-align:center;color:#aaa;padding:16px">No records</td></tr>'}
    </tbody>
  </table>


  <div class="footer">Work Report &nbsp;|&nbsp; ${o} &nbsp;|&nbsp; Inspections: ${r.length} &nbsp;|&nbsp; Work units: ${G} &nbsp;|&nbsp; Office: ${L} hrs${g>0?` &nbsp;|&nbsp; Parking: $${g.toFixed(2)}`:""}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`,F=window.open("","_blank","width=900,height=700");F&&(F.document.write(ne),F.document.close())};return e.jsxs("div",{children:[e.jsxs("div",{className:"page-toolbar",style:{marginBottom:12},children:[e.jsx(we,{children:"History"}),e.jsxs(q,{className:"page-toolbar-actions",size:4,wrap:!0,children:[e.jsx(je,{value:b,onChange:t=>{t?.[0]&&t[1]&&X([t[0],t[1]])},allowClear:!1,size:"small",presets:[{label:"This week",value:[c().isoWeekday(1).startOf("day"),c().isoWeekday(7).endOf("day")]},{label:"This + last week",value:[c().subtract(1,"week").isoWeekday(1).startOf("day"),c().isoWeekday(7).endOf("day")]},{label:"Prev two weeks",value:[c().subtract(2,"week").isoWeekday(1).startOf("day"),c().subtract(1,"week").isoWeekday(7).endOf("day")]}]}),e.jsx(j,{icon:e.jsx(le,{}),size:"small",onClick:z,loading:C,children:"Refresh"}),e.jsx(j,{icon:e.jsx(de,{}),size:"small",type:"primary",onClick:ie,disabled:r.length===0,children:"Export PDF"})]})]}),e.jsxs("div",{style:{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"},children:[e.jsx(O,{label:"Inspections",value:r.length,sub:`Work units: ${k.workUnits}${f.map(t=>{const s=r.filter(o=>o.type===t.id).length;return s>0?` · ${t.name}: ${s}`:null}).filter(Boolean).join("")||""}`}),e.jsx(O,{label:"Office Hours",value:`${k.officeHours} hrs`,sub:`${k.workdays} workdays × 1 hr/day`}),e.jsx(O,{label:"Parking Fees",value:k.totalParking>0?`$${k.totalParking.toFixed(2)}`:"—",sub:k.totalParking>0?e.jsx("a",{href:A,target:"_blank",rel:"noreferrer",style:{color:"#2383E2",fontSize:"12px"},children:"View receipts ↗"}):"No parking this period"})]}),e.jsxs("div",{className:"responsive-search",children:[e.jsx(ce,{prefix:e.jsx(ge,{style:{color:"#ACABA9",fontSize:14}}),suffix:v?e.jsx(pe,{style:{color:"#ACABA9",fontSize:13,cursor:"pointer"},onClick:()=>H("")}):null,placeholder:"Search by address...",value:v,onChange:t=>H(t.target.value),allowClear:!1}),v&&e.jsx("span",{className:"responsive-search-meta",children:_?"Searching...":`${U.length} records found`})]}),e.jsx(xe,{spinning:C||_,children:e.jsx(ue,{className:"responsive-table",size:"small",dataSource:ee,columns:ae,rowKey:"id",scroll:{x:840},onRow:t=>({onDoubleClick:()=>{u!==t.id&&te(t)},style:{cursor:"pointer",background:u===t.id?"rgba(35, 131, 226, 0.05)":void 0,borderLeft:u===t.id?"3px solid #2383E2":"3px solid transparent"}}),pagination:{pageSize:30,showSizeChanger:!0,showQuickJumper:!0,showTotal:t=>e.jsxs("span",{style:{color:"#787774",fontSize:"13px"},children:[t," records"]})},locale:{emptyText:e.jsx(he,{description:e.jsx("span",{style:{color:"#ACABA9",fontSize:"13px"},children:"No records"})})}})})]})};export{Ae as default};
