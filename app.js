
const USERS = {
  camille: {name:"Camille", initial:"C"},
  inacio: {name:"Inácio", initial:"I"}
};

const state = {
  user: localStorage.getItem("rotina.currentUser") || null,
  tab: "tasks",
  cursor: new Date(),
  editingTaskId: null
};

const app = document.getElementById("app");
const taskDialog = document.getElementById("taskDialog");
const taskForm = document.getElementById("taskForm");
const frequency = document.getElementById("taskFrequency");

document.getElementById("closeModal").onclick = ()=>taskDialog.close();
document.getElementById("cancelModal").onclick = ()=>taskDialog.close();
frequency.onchange = toggleFrequencyFields;

function ns(k){ return `rotina.${state.user}.${k}`; }
function esc(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function pad(n){return String(n).padStart(2,"0")}
function keyDate(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function daysInMonth(){return new Date(state.cursor.getFullYear(),state.cursor.getMonth()+1,0).getDate();}
function mkDate(day){return new Date(state.cursor.getFullYear(),state.cursor.getMonth(),day,12);}
function today0(){const d=new Date(); d.setHours(0,0,0,0); return d}
function isToday(d){const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate()}
function future(d){const x=new Date(d);x.setHours(0,0,0,0);return x>today0()}
function due(d){return !future(d)}
function monthLabel(){return cap(state.cursor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}))}
function checkKey(taskId,d){return `${taskId}_${keyDate(d)}`}

function newTask(name,description,category,frequency,weekdays=[],monthdays=[]){
  return {id:crypto.randomUUID?.() || String(Date.now()+Math.random()),name,description,category,frequency,weekdays,monthdays};
}
function loadTasks(){
  const raw=localStorage.getItem(ns("tasks"));
  if(raw) return JSON.parse(raw);
  const seed = state.user==="camille"
    ? [newTask("Academia","","Saúde","weekdays",[1,3,5]),newTask("Beber 2L de água","","Saúde","daily")]
    : [newTask("Academia","","Saúde","weekdays",[1,2,4,5]),newTask("Estudar","","Estudos","weekdays",[1,2,3,4,5])];
  localStorage.setItem(ns("tasks"),JSON.stringify(seed));
  return seed;
}
function saveTasks(v){localStorage.setItem(ns("tasks"),JSON.stringify(v))}
function loadChecks(){return JSON.parse(localStorage.getItem(ns("checks"))||"{}")}
function saveChecks(v){localStorage.setItem(ns("checks"),JSON.stringify(v))}
function scheduled(task,d){
  if(task.frequency==="daily") return true;
  if(task.frequency==="weekdays") return (task.weekdays||[]).includes(d.getDay());
  return (task.monthdays||[]).includes(d.getDate());
}
function taskFrequencyText(t){
  if(t.frequency==="daily")return "Todos os dias";
  if(t.frequency==="monthdays")return `Dias ${t.monthdays.join(", ")}`;
  const names=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  return t.weekdays.map(x=>names[x]).join(", ");
}

function login(id){
  state.user=id; state.tab="tasks"; state.cursor=new Date();
  localStorage.setItem("rotina.currentUser",id); render();
}
function logout(){
  localStorage.removeItem("rotina.currentUser");
  state.user=null; render();
}
function render(){
  if(!state.user) return renderLogin();
  renderShell();
}
function renderLogin(){
  app.innerHTML=`
    <main class="login-screen">
      <section class="login-card">
        <div class="login-brand">
          <div class="brand-icon">▣</div>
          <strong>Rotina Mensal</strong>
        </div>
        <h1>Quem está usando?</h1>
        <p>As tarefas e o histórico ficam separados por perfil.</p>
        <div class="profile-list">
          ${Object.entries(USERS).map(([id,u])=>`
            <button class="profile-button" onclick="login('${id}')">
              <div class="avatar">${u.initial}</div>
              <div><strong>${u.name}</strong><span>Acessar painel</span></div>
            </button>`).join("")}
        </div>
      </section>
    </main>`;
}
function renderShell(){
  const u=USERS[state.user];
  app.innerHTML=`
    <header class="header">
      <div class="brand"><div class="brand-icon">▣</div><span>Rotina Mensal</span></div>
      <nav class="nav">
        <button class="nav-btn ${state.tab==="tasks"?"active":""}" onclick="switchTab('tasks')">☷ <span>Tarefas</span></button>
        <button class="nav-btn ${state.tab==="dashboard"?"active":""}" onclick="switchTab('dashboard')">⌘ <span>Dashboard</span></button>
      </nav>
      <div class="user-area">
        <div class="user-pill"><div class="avatar">${u.initial}</div><span class="user-name">${u.name}</span></div>
        <button class="logout-btn" onclick="logout()">Sair</button>
      </div>
    </header>
    <div id="page"></div>`;
  state.tab==="tasks"?renderTasks():renderDashboard();
}
function switchTab(tab){state.tab=tab;renderShell()}
function changeMonth(delta){state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()+delta,1);renderShell()}
function goToday(){state.cursor=new Date();renderShell()}

function pageTop(title,sub,withAdd=false){
  return `<div class="page-top">
    <div class="title-block"><h1>${title}</h1><p>${sub}</p></div>
    <div class="month-controls">
      <button class="btn btn-icon" onclick="changeMonth(-1)">‹</button>
      <div class="month-label">${monthLabel()}</div>
      <button class="btn btn-icon" onclick="changeMonth(1)">›</button>
      <button class="btn btn-light" onclick="goToday()">Hoje</button>
      ${withAdd?`<button class="btn btn-dark" onclick="openTask()"><span class="plus">＋</span>Nova tarefa</button>`:""}
    </div>
  </div>`;
}
function renderTasks(){
  const page=document.getElementById("page");
  const tasks=loadTasks(), checks=loadChecks();
  const days=Array.from({length:daysInMonth()},(_,i)=>i+1);
  page.innerHTML=`<main class="page">
    ${pageTop("Tarefas do mês","Clique nas células para marcar a execução de cada dia.",true)}
    <section class="panel table-scroll desktop-tasks">
      <table class="task-table">
        <thead><tr>
          <th class="task-col">Tarefa</th>
          ${days.map(n=>{const d=mkDate(n);return `<th class="day-col ${isToday(d)?"today-head":""}"><div class="day-number">${n}</div><div class="day-week">${d.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","").charAt(0).toUpperCase()}</div></th>`}).join("")}
          <th class="summary-col">Resumo</th>
        </tr></thead>
        <tbody>${tasks.map(t=>taskRow(t,days,checks)).join("")}</tbody>
      </table>
    </section>
    <section class="mobile-tasks">
      ${tasks.map(t=>taskMobileCard(t,days,checks)).join("")}
    </section>
    <div class="legend">
      ${legend("green","Concluída")}
      ${legend("red","Prevista e não feita")}
      ${legend("gray","Não prevista")}
      ${legend("future","Dia futuro")}
    </div>
  </main>`;
}
function legend(cls,text){return `<div class="legend-item"><span class="legend-dot ${cls}"></span>${text}</div>`}
function taskRow(task,days,checks){
  let exp=0,done=0;
  days.forEach(n=>{const d=mkDate(n);if(scheduled(task,d)&&due(d)){exp++;if(checks[checkKey(task.id,d)])done++}});
  const pct=exp?Math.round(done/exp*100):0;
  return `<tr>
    <td class="task-col"><div class="task-meta">
      <div><div class="task-name">${esc(task.name)}</div><div class="task-sub">${esc(taskFrequencyText(task))}</div></div>
      <button class="kebab" onclick="openTask('${task.id}')" title="Editar">⋮</button>
    </div></td>
    ${days.map(n=>{
      const d=mkDate(n), sch=scheduled(task,d), done=!!checks[checkKey(task.id,d)];
      let td="",b="day-check";
      if(!sch){td="not-scheduled";b+=" disabled"}
      else if(future(d)){td="future";b+=" future-check"}
      else if(done){td="done";b+=" checked"}
      else td="missed";
      return `<td class="day-cell ${td}">
        <button class="${b}" ${(!sch||future(d))?"disabled":""} onclick="toggleCheck('${task.id}','${keyDate(d)}')">${done?"✓":""}</button>
      </td>`;
    }).join("")}
    <td class="summary-col"><div class="summary-pct">${pct}%</div><div class="summary-sub">${done}/${exp} previstos</div></td>
  </tr>`;
}

function taskMobileCard(task,days,checks){
  let exp=0,done=0;
  days.forEach(n=>{
    const d=mkDate(n);
    if(scheduled(task,d)&&due(d)){exp++;if(checks[checkKey(task.id,d)])done++}
  });
  const pct=exp?Math.round(done/exp*100):0;
  const firstDay=new Date(state.cursor.getFullYear(),state.cursor.getMonth(),1).getDay();
  const blanks=Array.from({length:firstDay},()=>`<div class="mobile-day blank"></div>`).join("");
  return `<article class="mobile-task-card">
    <div class="mobile-task-head">
      <div>
        <div class="mobile-task-title">${esc(task.name)}</div>
        <div class="mobile-task-frequency">${esc(taskFrequencyText(task))}</div>
      </div>
      <div class="mobile-task-head-right">
        <div class="mobile-task-summary"><strong>${pct}%</strong><span>${done}/${exp}</span></div>
        <button class="mobile-edit" onclick="openTask('${task.id}')" aria-label="Editar ${esc(task.name)}">⋮</button>
      </div>
    </div>
    <div class="mobile-week-head">
      ${["D","S","T","Q","Q","S","S"].map(x=>`<span>${x}</span>`).join("")}
    </div>
    <div class="mobile-calendar">
      ${blanks}
      ${days.map(n=>{
        const d=mkDate(n),sch=scheduled(task,d),checked=!!checks[checkKey(task.id,d)];
        let cls="mobile-day";
        if(!sch)cls+=" not-scheduled";
        else if(future(d))cls+=" future";
        else if(checked)cls+=" done";
        else if(isToday(d))cls+=" pending";
        else cls+=" missed";
        return `<button class="${cls}" ${(!sch||future(d))?"disabled":""} onclick="toggleCheck('${task.id}','${keyDate(d)}')">
          <span class="mobile-day-number">${n}</span>
          <span class="mobile-day-mark">${checked?"✓":""}</span>
        </button>`;
      }).join("")}
    </div>
  </article>`;
}

function toggleCheck(taskId,dateStr){
  const d=new Date(dateStr+"T12:00:00");
  const task=loadTasks().find(t=>t.id===taskId);
  if(!task||!scheduled(task,d)||future(d))return;
  const c=loadChecks(),k=checkKey(taskId,d);
  c[k]=!c[k]; if(!c[k])delete c[k];
  saveChecks(c);renderShell();
}
function openTask(id=null){
  const tasks=loadTasks(),t=tasks.find(x=>x.id===id);
  state.editingTaskId=id;
  document.getElementById("modalTitle").textContent=id?"Editar tarefa":"Nova tarefa";
  document.getElementById("taskName").value=t?.name||"";
  document.getElementById("taskDescription").value=t?.description||"";
  document.getElementById("taskCategory").value=t?.category||"";
  frequency.value=t?.frequency||"daily";
  document.querySelectorAll('#weekdaysSection input').forEach(cb=>cb.checked=!!t?.weekdays?.includes(Number(cb.value)));
  document.getElementById("monthDays").value=t?.monthdays?.join(", ")||"";
  toggleFrequencyFields();taskDialog.showModal();
}
function toggleFrequencyFields(){
  document.getElementById("weekdaysSection").classList.toggle("hidden",frequency.value!=="weekdays");
  document.getElementById("monthdaysSection").classList.toggle("hidden",frequency.value!=="monthdays");
}
taskForm.onsubmit=e=>{
  e.preventDefault();
  const tasks=loadTasks();
  const data={
    name:document.getElementById("taskName").value.trim(),
    description:document.getElementById("taskDescription").value.trim(),
    category:document.getElementById("taskCategory").value.trim(),
    frequency:frequency.value,
    weekdays:[...document.querySelectorAll('#weekdaysSection input:checked')].map(x=>Number(x.value)),
    monthdays:document.getElementById("monthDays").value.split(",").map(x=>Number(x.trim())).filter(x=>x>=1&&x<=31)
  };
  if(data.frequency==="weekdays"&&!data.weekdays.length)return alert("Selecione ao menos um dia.");
  if(data.frequency==="monthdays"&&!data.monthdays.length)return alert("Informe ao menos um dia do mês.");
  if(state.editingTaskId){
    const i=tasks.findIndex(x=>x.id===state.editingTaskId);
    tasks[i]={...tasks[i],...data};
  }else tasks.push(newTask(data.name,data.description,data.category,data.frequency,data.weekdays,data.monthdays));
  saveTasks(tasks);taskDialog.close();renderShell();
};

function renderDashboard(){
  const page=document.getElementById("page");
  const tasks=loadTasks(),checks=loadChecks();
  const days=Array.from({length:daysInMonth()},(_,i)=>i+1);
  const m=metrics(tasks,checks,days);
  page.innerHTML=`<main class="page">
    ${pageTop("Dashboard","Somente ocorrências já vencidas entram nos cálculos.")}
    <div class="metrics-grid">
      ${metric("◉","CONCLUSÃO DO MÊS ATÉ HOJE",`${m.rate}%`,`<div class="progress"><span style="width:${m.rate}%"></span></div>`)}
      ${metric("♨","SEQUÊNCIA ATUAL",`${m.currentStreak} dias`,"Dias com 80%+ de execução.")}
      ${metric("♜","MELHOR SEQUÊNCIA DO MÊS",`${m.bestStreak} dias`,"Recorde dentro deste mês.")}
      ${metric("⌁","PREVISTO X REALIZADO",`${m.done}/${m.expected}`,`${Math.max(m.expected-m.done,0)} ocorrências em aberto.`)}
    </div>

    <section class="section-card">
      <h2 class="section-title">Mapa de execução</h2>
      <div class="heat-scroll dashboard-heatmap">${heatmap(tasks,checks,days)}</div>
      <div class="legend heat-legend">
        ${legendSolid("var(--green)","Prevista e concluída")}
        ${legendSolid("var(--red)","Prevista e não feita")}
        ${legendSolid("var(--amber)","Pendente hoje")}
        ${legendSolid("var(--soft2)","Não prevista")}
        ${legendSolid("#fff","Dia futuro",true)}
      </div>
    </section>

    <h2 class="insight-title">Insights</h2>
    <div class="insight-grid">
      ${insight("MAIOR CONSISTÊNCIA",m.bestTask.main,m.bestTask.sub)}
      ${insight("MENOR ADERÊNCIA",m.worstTask.main,m.worstTask.sub)}
      ${insight("MELHOR DIA DA SEMANA",m.bestDay.main,m.bestDay.sub)}
      ${insight("PIOR DIA DA SEMANA",m.worstDay.main,m.worstDay.sub)}
      ${insight("SEMANA ATUAL X ANTERIOR",m.weekCompare.main,m.weekCompare.sub)}
      ${insight("TAREFAS ATRASADAS HOJE",String(m.todayPending),m.todayPending?"Há tarefas pendentes hoje.":"Nada pendente para hoje até agora.")}
    </div>

    <section class="section-card">
      <h2 class="section-title">Execução por dia da semana</h2>
      <div class="week-grid">${m.weekdays.map(x=>`<div class="week-box"><div class="day">${x.name}</div><div class="pct">${x.rate===null?"—":Math.round(x.rate*100)+"%"}</div></div>`).join("")}</div>
    </section>
  </main>`;
}
function metric(icon,title,value,sub){return `<section class="metric-card"><div class="metric-title"><span>${icon}</span>${title}</div><div class="metric-value">${value}</div><div class="metric-sub">${sub}</div></section>`}
function insight(label,main,sub){return `<section class="insight-card"><div class="insight-label">${label}</div><div class="insight-main">${main}</div><div class="insight-sub">${sub}</div></section>`}
function legendSolid(color,text,dashed=false){return `<div class="legend-item"><span class="legend-dot" style="background:${color};${dashed?"border-style:dashed":""}"></span>${text}</div>`}
function heatmap(tasks,checks,days){
  return `<div class="heat-grid">
    <div class="heat-row"><div class="heat-label">Tarefa</div>${days.map(n=>`<div class="heat-head">${n}</div>`).join("")}</div>
    ${tasks.map(t=>`<div class="heat-row"><div class="heat-label">${esc(t.name)}</div>${days.map(n=>{
      const d=mkDate(n),sch=scheduled(t,d),done=!!checks[checkKey(t.id,d)];
      let cls="heat-cell";
      if(!sch){}else if(future(d))cls+=" future";else if(done)cls+=" done";else if(isToday(d))cls+=" pending";else cls+=" missed";
      return `<div class="${cls}" title="${esc(t.name)} • ${d.toLocaleDateString("pt-BR")}"></div>`;
    }).join("")}</div>`).join("")}
  </div>`;
}

function heatmapMobile(tasks,checks,days){
  return `<div class="mobile-heat-list">
    ${tasks.map(t=>`
      <article class="mobile-heat-card">
        <div class="mobile-heat-title">${esc(t.name)}</div>
        <div class="mobile-heat-days">
          ${days.map(n=>{
            const d=mkDate(n),sch=scheduled(t,d),done=!!checks[checkKey(t.id,d)];
            let cls="mobile-heat-day";
            if(!sch)cls+=" not-scheduled";
            else if(future(d))cls+=" future";
            else if(done)cls+=" done";
            else if(isToday(d))cls+=" pending";
            else cls+=" missed";
            return `<div class="${cls}" title="${esc(t.name)} • ${d.toLocaleDateString("pt-BR")}"><span>${n}</span></div>`;
          }).join("")}
        </div>
      </article>
    `).join("")}
  </div>`;
}

function metrics(tasks,checks,days){
  let expected=0,done=0;
  const taskStats=[],weekdayStats=Array.from({length:7},()=>({e:0,d:0}));
  const daily=[];
  for(const n of days){
    const d=mkDate(n); if(!due(d))continue;
    let e=0,ok=0;
    for(const t of tasks) if(scheduled(t,d)){
      expected++;e++;weekdayStats[d.getDay()].e++;
      if(checks[checkKey(t.id,d)]){done++;ok++;weekdayStats[d.getDay()].d++}
    }
    if(e)daily.push({date:d,rate:ok/e});
  }
  for(const t of tasks){
    let e=0,ok=0;
    for(const n of days){const d=mkDate(n);if(due(d)&&scheduled(t,d)){e++;if(checks[checkKey(t.id,d)])ok++}}
    if(e)taskStats.push({name:t.name,rate:ok/e,done:ok,e});
  }
  const sorted=[...taskStats].sort((a,b)=>b.rate-a.rate);
  const best=sorted[0],worst=sorted.length>1?sorted[sorted.length-1]:null;
  let bestStreak=0,currentStreak=0,temp=0;
  daily.forEach(x=>{if(x.rate>=.8){temp++;bestStreak=Math.max(bestStreak,temp)}else temp=0});
  for(let i=daily.length-1;i>=0;i--){if(daily[i].rate>=.8)currentStreak++;else break}
  const names=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
  const weekdays=weekdayStats.map((x,i)=>({name:names[i],rate:x.e?x.d/x.e:null}));
  const valid=weekdays.filter(x=>x.rate!==null);
  const bestDay=[...valid].sort((a,b)=>b.rate-a.rate)[0];
  const worstDay=[...valid].sort((a,b)=>a.rate-b.rate)[0];

  const now=new Date(); let thisE=0,thisD=0,prevE=0,prevD=0;
  const start=new Date(now);start.setHours(0,0,0,0);start.setDate(now.getDate()-((now.getDay()+6)%7));
  const prevStart=new Date(start);prevStart.setDate(prevStart.getDate()-7);
  for(const t of tasks){
    for(let i=0;i<14;i++){
      const d=new Date(prevStart);d.setDate(prevStart.getDate()+i);d.setHours(12,0,0,0);
      if(d.getMonth()!==state.cursor.getMonth()||d.getFullYear()!==state.cursor.getFullYear()||d>now||!scheduled(t,d))continue;
      const ok=!!checks[checkKey(t.id,d)];
      if(d>=start){thisE++;if(ok)thisD++}else{prevE++;if(ok)prevD++}
    }
  }
  const curRate=thisE?Math.round(thisD/thisE*100):null,prevRate=prevE?Math.round(prevD/prevE*100):null;
  let weekCompare={main:"—",sub:"Dados insuficientes para uma conclusão."};
  if(curRate!==null&&prevRate!==null){
    const diff=curRate-prevRate;
    weekCompare={main:`${curRate}% vs ${prevRate}%`,sub:diff===0?"Mesmo desempenho dos 7 dias anteriores.":`${Math.abs(diff)} pontos ${diff>0?"acima":"abaixo"} dos 7 dias anteriores.`}
  }
  const today=new Date();
  const todayPending=tasks.filter(t=>scheduled(t,today)&&!checks[checkKey(t.id,today)]).length;
  return {
    expected,done,rate:expected?Math.round(done/expected*100):0,currentStreak,bestStreak,
    bestTask:best?{main:best.name,sub:`${Math.round(best.rate*100)}% de execução (${best.done}/${best.e})`}:{main:"—",sub:"Dados insuficientes para uma conclusão."},
    worstTask:worst?{main:worst.name,sub:`${Math.round(worst.rate*100)}% de execução (${worst.done}/${worst.e})`}:{main:"—",sub:"Dados insuficientes para uma conclusão."},
    bestDay:bestDay?{main:bestDay.name,sub:`${Math.round(bestDay.rate*100)}% de conclusão`}:{main:"—",sub:"Dados insuficientes."},
    worstDay:worstDay?{main:worstDay.name,sub:`${Math.round(worstDay.rate*100)}% de conclusão`}:{main:"—",sub:"Dados insuficientes."},
    weekCompare,todayPending,weekdays
  };
}

render();
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
