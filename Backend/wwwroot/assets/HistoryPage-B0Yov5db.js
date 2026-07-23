import{a as z,j as e}from"./index-CwDT5wd5.js";import{b as r}from"./react-Ap4-mdaO.js";import{j as l,u as N,l as _,D as q,B as j,m as ne,a4 as re,I as le,o as de,p as ce,S as pe,q as ge,E as xe,G as B,s as L,T as G,y as ue,H as he,J as fe,e as me}from"./antd-Bv-C0dSy.js";import{i as ye}from"./isoWeek-DZHAe6y9.js";import{A as E,E as be}from"./api-CDO-ql5W.js";import{h as D}from"./errorHandler-pxhC3MHL.js";import{I as ke}from"./shared-C2a6c9tY.js";import{u as ve}from"./useInspectionTypes-C0aA3nBP.js";l.extend(ye);const{RangePicker:Se}=q,R=be.parkingReceipts,K={fontSize:"12px",letterSpacing:"0.2px"},je=(v,u)=>{let d=0,f=v.startOf("day");const w=u.startOf("day");for(;!f.isAfter(w);){const S=f.day();S!==0&&S!==6&&d++,f=f.add(1,"day")}return d},T=({label:v,value:u,sub:d})=>e.jsxs("div",{style:{flex:1,minWidth:130,background:"#FFFFFF",border:"1px solid #E9E9E7",borderRadius:6,padding:"12px 16px"},children:[e.jsx("div",{style:{fontSize:"11px",color:"#55534e",letterSpacing:"0.5px",textTransform:"uppercase",fontWeight:500,marginBottom:6},children:v}),e.jsx("div",{style:{fontSize:"24px",fontWeight:700,color:"#37352F",lineHeight:1},children:u}),d&&e.jsx("div",{style:{fontSize:"12px",color:"#787774",marginTop:5},children:d})]}),Te=()=>{const{getType:v,types:u}=ve(),[d,f]=r.useState([]),[w,S]=r.useState(!1),[J,P]=r.useState(!1),[h,Y]=r.useState(null),[c,m]=r.useState(null),[y,U]=r.useState([l().subtract(13,"day"),l()]),[b,A]=r.useState(""),[I,O]=r.useState([]),[M,H]=r.useState(!1),Q=r.useMemo(()=>u.map(t=>({value:t.id,label:t.name})),[u]),V=b.trim()?I:d;r.useEffect(()=>{const t=b.trim();if(!t){O([]);return}const s=setTimeout(async()=>{H(!0);try{const i=await z.get(E.inspectionRecords,{params:{address:t}});O(i.data)}catch(i){D(i,"Failed to search")}finally{H(!1)}},400);return()=>clearTimeout(s)},[b]);const C=r.useCallback(async()=>{S(!0);try{const[t,s]=y,i=await z.get(E.inspectionRecords,{params:{startDate:t.startOf("day").toISOString(),endDate:s.endOf("day").toISOString()}});f(i.data)}catch(t){D(t,"Failed to fetch history")}finally{S(!1)}},[y]);r.useEffect(()=>{C()},[C]);const k=r.useMemo(()=>{const[t,s]=y,i=je(t,s),a=i,o=d.reduce((g,x)=>g+(x.parkingFee??0),0);return{workdays:i,officeHours:a,totalParking:o}},[y,d]),X=r.useCallback(t=>{Y(t.id),m({executionDate:l(t.executionDate),type:t.type,isCharged:t.isCharged,parkingFee:t.parkingFee??null})},[]),$=r.useCallback(()=>{Y(null),m(null)},[]),Z=r.useCallback(async t=>{if(c){P(!0);try{await z.put(`${E.inspectionRecords}/${t.id}`,{executionDate:c.executionDate.toISOString(),type:c.type,isCharged:c.isCharged,parkingFee:c.parkingFee??null}),f(s=>s.map(i=>i.id===t.id?{...i,executionDate:c.executionDate.toISOString(),type:c.type,isCharged:c.isCharged,parkingFee:c.parkingFee??void 0}:i)),N.success("Record updated"),$()}catch(s){D(s,"Failed to update record")}finally{P(!1)}}},[c,$]),ee=[{title:"Date",key:"date",width:170,render:(t,s)=>h===s.id?e.jsx(q,{value:c.executionDate,onChange:a=>a&&m(o=>o&&{...o,executionDate:a}),showTime:!0,format:"YYYY-MM-DD HH:mm",size:"small",style:{width:155},onClick:a=>a.stopPropagation()}):e.jsx("span",{style:{color:"#2383E2",fontSize:"13px",fontWeight:500,letterSpacing:"0.2px"},children:l(s.executionDate).format("YYYY-MM-DD HH:mm")})},{title:"Address",key:"address",ellipsis:{showTitle:!1},render:(t,s)=>e.jsx(B,{title:s.propertyAddress,children:e.jsx("span",{style:{color:"#37352F",fontWeight:600,fontSize:"14px"},children:s.propertyAddress||"-"})})},{title:"Type",key:"type",width:130,render:(t,s)=>{if(h===s.id)return e.jsx(L,{value:c.type,onChange:o=>m(g=>g&&{...g,type:o}),options:Q,size:"small",style:{width:110},onClick:o=>o.stopPropagation()});const a=v(s.type);return a?e.jsx(G,{color:a.color,style:K,children:a.name}):e.jsx("span",{style:{color:"#E03E3E",fontSize:"12px"},children:String(s.type)})}},{title:"Charged",key:"charge",width:110,render:(t,s)=>h===s.id?e.jsx(L,{value:c.isCharged,onChange:a=>m(o=>o&&{...o,isCharged:a}),options:[{value:!0,label:"Charged"},{value:!1,label:"Free"}],size:"small",style:{width:90},onClick:a=>a.stopPropagation()}):e.jsx(G,{color:s.isCharged?"gold":"green",style:K,children:s.isCharged?"Charged":"Free"})},{title:"Parking",key:"parking",width:110,render:(t,s)=>h===s.id?e.jsx(ue,{value:c.parkingFee,onChange:a=>m(o=>o&&{...o,parkingFee:a}),min:0,precision:2,prefix:"$",placeholder:"0.00",size:"small",style:{width:90},onClick:a=>a.stopPropagation()}):s.parkingFee!=null&&s.parkingFee>0?e.jsxs("span",{style:{color:"#37352F",fontSize:"13px",fontWeight:500},children:["$",s.parkingFee.toFixed(2)]}):e.jsx("span",{style:{color:"#ACABA9",fontSize:"13px"},children:"—"})},{title:"",key:"actions",width:80,render:(t,s)=>h===s.id?e.jsxs(_,{size:4,onClick:a=>a.stopPropagation(),children:[e.jsx(j,{size:"small",type:"primary",icon:e.jsx(he,{}),loading:J,onClick:()=>Z(s),"aria-label":"Save record"}),e.jsx(j,{size:"small",icon:e.jsx(fe,{}),onClick:$,"aria-label":"Cancel edit"})]}):e.jsx(B,{title:"Copy",children:e.jsx(j,{size:"small",icon:e.jsx(me,{}),"aria-label":"Copy record",onClick:a=>{a.stopPropagation();const o=`${l(s.executionDate).format("DMMMYYYY")}:${s.propertyAddress??""}`;navigator.clipboard.writeText(o),N.success("Copied")}})})}],te=()=>{const[t,s]=y,i=`${t.format("D MMM YYYY")} – ${s.format("D MMM YYYY")}`,a=l().format("D MMM YYYY, HH:mm"),o=n=>{const p=u.find(oe=>oe.id===n);return p?p.name:String(n)},g={};let x=0;for(const n of d){const p=o(n.type);g[p]=(g[p]??0)+1,n.parkingFee&&(x+=n.parkingFee)}const{workdays:se,officeHours:W}=k,ae=d.slice().sort((n,p)=>l(n.executionDate).valueOf()-l(p.executionDate).valueOf()).map((n,p)=>`
        <tr>
          <td class="num">${p+1}</td>
          <td class="mono">${l(n.executionDate).format("DD MMM YYYY")}</td>
          <td class="mono dim">${l(n.executionDate).format("HH:mm")}</td>
          <td>${n.propertyAddress??"-"}</td>
          <td class="center">${o(n.type)}</td>
          <td class="center">${n.isCharged?"Charged":"Free"}</td>
          <td class="center">${n.parkingFee!=null&&n.parkingFee>0?"$"+n.parkingFee.toFixed(2):"—"}</td>
        </tr>`).join(""),ie=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Work Report – ${i}</title>
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
  <div class="meta">Period: ${i} &nbsp;&nbsp; Generated: ${a}</div>

  ${x>0?`<div class="receipts">Parking receipts (Google Drive): <a href="${R}">${R}</a></div>`:""}

  <div class="summary-grid">
    <div class="stat-box">
      <div class="stat-label">Inspections</div>
      <div class="stat-value">${d.length}</div>
      <div class="stat-sub">${Object.entries(g).map(([n,p])=>`${n}: ${p}`).join(" · ")}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Office Hours</div>
      <div class="stat-value">${W} hrs</div>
      <div class="stat-sub">${se} workdays × 1 hr/day</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Parking Fees</div>
      <div class="stat-value">${x>0?"$"+x.toFixed(2):"—"}</div>
      <div class="stat-sub">${x>0?"Receipts in Google Drive":"No parking charges"}</div>
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
        <th class="center">Parking</th>
      </tr>
    </thead>
    <tbody>
      ${ae||'<tr><td colspan="7" style="text-align:center;color:#aaa;padding:16px">No records</td></tr>'}
    </tbody>
  </table>


  <div class="footer">Work Report &nbsp;|&nbsp; ${i} &nbsp;|&nbsp; Inspections: ${d.length} &nbsp;|&nbsp; Office: ${W} hrs${x>0?` &nbsp;|&nbsp; Parking: $${x.toFixed(2)}`:""}</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`,F=window.open("","_blank","width=900,height=700");F&&(F.document.write(ie),F.document.close())};return e.jsxs("div",{children:[e.jsxs("div",{className:"page-toolbar",style:{marginBottom:12},children:[e.jsx(ke,{children:"History"}),e.jsxs(_,{className:"page-toolbar-actions",size:4,wrap:!0,children:[e.jsx(Se,{value:y,onChange:t=>{t?.[0]&&t[1]&&U([t[0],t[1]])},allowClear:!1,size:"small",presets:[{label:"This week",value:[l().isoWeekday(1).startOf("day"),l().isoWeekday(7).endOf("day")]},{label:"This + last week",value:[l().subtract(1,"week").isoWeekday(1).startOf("day"),l().isoWeekday(7).endOf("day")]},{label:"Prev two weeks",value:[l().subtract(2,"week").isoWeekday(1).startOf("day"),l().subtract(1,"week").isoWeekday(7).endOf("day")]}]}),e.jsx(j,{icon:e.jsx(ne,{}),size:"small",onClick:C,loading:w,children:"Refresh"}),e.jsx(j,{icon:e.jsx(re,{}),size:"small",type:"primary",onClick:te,disabled:d.length===0,children:"Export PDF"})]})]}),e.jsxs("div",{style:{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"},children:[e.jsx(T,{label:"Inspections",value:d.length,sub:u.map(t=>{const s=d.filter(i=>i.type===t.id).length;return s>0?`${t.name}: ${s}`:null}).filter(Boolean).join("  ·  ")||void 0}),e.jsx(T,{label:"Office Hours",value:`${k.officeHours} hrs`,sub:`${k.workdays} workdays × 1 hr/day`}),e.jsx(T,{label:"Parking Fees",value:k.totalParking>0?`$${k.totalParking.toFixed(2)}`:"—",sub:k.totalParking>0?e.jsx("a",{href:R,target:"_blank",rel:"noreferrer",style:{color:"#2383E2",fontSize:"12px"},children:"View receipts ↗"}):"No parking this period"})]}),e.jsxs("div",{className:"responsive-search",children:[e.jsx(le,{prefix:e.jsx(ce,{style:{color:"#ACABA9",fontSize:14}}),suffix:b?e.jsx(de,{style:{color:"#ACABA9",fontSize:13,cursor:"pointer"},onClick:()=>A("")}):null,placeholder:"Search by address...",value:b,onChange:t=>A(t.target.value),allowClear:!1}),b&&e.jsx("span",{className:"responsive-search-meta",children:M?"Searching...":`${I.length} records found`})]}),e.jsx(pe,{spinning:w||M,children:e.jsx(ge,{className:"responsive-table",size:"small",dataSource:V,columns:ee,rowKey:"id",scroll:{x:760},onRow:t=>({onDoubleClick:()=>{h!==t.id&&X(t)},style:{cursor:"pointer",background:h===t.id?"rgba(35, 131, 226, 0.05)":void 0,borderLeft:h===t.id?"3px solid #2383E2":"3px solid transparent"}}),pagination:{pageSize:30,showSizeChanger:!0,showQuickJumper:!0,showTotal:t=>e.jsxs("span",{style:{color:"#787774",fontSize:"13px"},children:[t," records"]})},locale:{emptyText:e.jsx(xe,{description:e.jsx("span",{style:{color:"#ACABA9",fontSize:"13px"},children:"No records"})})}})})]})};export{Te as default};
