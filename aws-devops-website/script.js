(() => {
  "use strict";
  const KEY = "priyanka-personal-desk-v1";
  const emptyData = () => ({tasks: [], projects: [], events: [], habits: [], notes: []});
  let data = loadData();
  let taskFilter = "all";
  let toastTimer;

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved || typeof saved !== "object") return emptyData();
      const base = emptyData();
      for (const key of Object.keys(base)) base[key] = Array.isArray(saved[key]) ? saved[key] : [];
      return base;
    } catch { return emptyData(); }
  }
  function persist(message) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      if (message) toast(message);
    } catch {
      toast("Browser storage is unavailable or full. Export your data and check browser settings.");
    }
    updateOverview();
  }
  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function $(selector) { return document.querySelector(selector); }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function toast(message) {
    const node = $("#toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2600);
  }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function formatDate(value, options = {day:"numeric", month:"short", year:"numeric"}) {
    if (!value) return "No due date";
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
    return new Date(parts[0], parts[1]-1, parts[2]).toLocaleDateString("en-IN", options);
  }
  function escapeText(value) { return String(value ?? ""); }

  function initDate() {
    const now = new Date();
    $("#todayTop").textContent = now.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"}).toUpperCase();
    $("#todayLong").textContent = now.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
    $("#habitDateLabel").textContent = now.toLocaleDateString("en-IN",{day:"numeric",month:"short"}).toUpperCase();
    $("#taskDue").min = todayKey();
    $("#eventDate").min = todayKey();
  }
  function updateOverview() {
    const open = data.tasks.filter(t => !t.completed).length;
    const completed = data.tasks.filter(t => t.completed).length;
    const total = data.tasks.length;
    $("#openTaskStat").textContent = open;
    $("#completedTaskStat").textContent = completed;
    $("#activeProjectStat").textContent = data.projects.filter(p => p.status !== "Completed").length;
    $("#habitStat").textContent = data.habits.filter(h => h.checks && h.checks.includes(todayKey())).length;
    $("#navTaskCount").textContent = open;
    $("#overallProgress").style.width = (total ? Math.round(completed / total * 100) : 0) + "%";
    $("#overallProgressText").textContent = total ? `${Math.round(completed / total * 100)}% of tasks completed` : "Your progress starts here";
    $("#taskFooter").textContent = `${total} ${total === 1 ? "task" : "tasks"} · ${open} open`;
    renderUpcoming();
  }

  function renderTasks() {
    const list = $("#taskList");
    const query = $("#taskSearch").value.trim().toLowerCase();
    const tasks = data.tasks.filter(t => {
      const filterMatch = taskFilter === "all" || (taskFilter === "open" && !t.completed) || (taskFilter === "done" && t.completed);
      return filterMatch && `${t.title} ${t.category} ${t.priority}`.toLowerCase().includes(query);
    }).sort((a,b) => Number(a.completed)-Number(b.completed) || (a.due || "9999").localeCompare(b.due || "9999"));
    list.replaceChildren();
    if (!tasks.length) {
      const empty = make("div","empty-state");
      empty.append(make("strong", "", data.tasks.length ? "Nothing to show just yet." : "A fresh page awaits."),
        make("span","",data.tasks.length ? "Try another filter or search term." : "Add your first task above and begin with intention."));
      list.append(empty);
    }
    tasks.forEach(task => {
      const row = make("article","task-row" + (task.completed ? " is-complete" : ""));
      const check = make("input","task-check"); check.type = "checkbox"; check.checked = task.completed;
      check.setAttribute("aria-label","Mark task complete");
      check.addEventListener("change", () => { task.completed = check.checked; persist(); renderTasks(); });
      const content = make("div");
      content.append(make("p","task-title",task.title));
      content.append(make("p","task-meta",`${task.category} · ${task.due ? "Due " + formatDate(task.due) : "No due date"}`));
      const priority = make("span","priority " + (["High","Low","Normal"].includes(task.priority) ? task.priority : "Normal"),task.priority || "Normal");
      const del = make("button","delete-button","Delete"); del.type = "button"; del.setAttribute("aria-label","Delete task");
      del.addEventListener("click", () => { data.tasks = data.tasks.filter(t => t.id !== task.id); persist("Task deleted."); renderTasks(); });
      row.append(check,content,priority,del); list.append(row);
    });
    updateOverview();
  }
  $("#taskForm").addEventListener("submit", e => {
    e.preventDefault();
    const title = $("#taskTitle").value.trim();
    if (!title) return;
    data.tasks.push({id:id(),title,category:$("#taskCategory").value,priority:$("#taskPriority").value,due:$("#taskDue").value,completed:false,created:todayKey()});
    $("#taskForm").reset(); persist("Task added."); renderTasks();
  });
  document.querySelectorAll("[data-task-filter]").forEach(button => button.addEventListener("click", () => {
    taskFilter = button.dataset.taskFilter;
    document.querySelectorAll("[data-task-filter]").forEach(b => b.classList.toggle("active", b === button));
    renderTasks();
  }));
  $("#taskSearch").addEventListener("input",renderTasks);
  $("#clearTasks").addEventListener("click", () => {
    const count = data.tasks.filter(t => t.completed).length;
    if (!count) return toast("There are no completed tasks to clear.");
    if (confirm(`Delete ${count} completed task(s)?`)) { data.tasks = data.tasks.filter(t => !t.completed); persist("Completed tasks cleared."); renderTasks(); }
  });

  function renderProjects() {
    const grid = $("#projectGrid"); grid.replaceChildren();
    if (!data.projects.length) { grid.append(make("div","empty-state","Your project journal is ready. Add a project above.")); return; }
    data.projects.forEach((project,index) => {
      const card = make("article","project-card");
      const top = make("div","project-top"); top.append(make("span","work-number",String(index+1).padStart(2,"0")),make("span","status-tag" + (project.status==="Completed"?" completed":""),project.status));
      card.append(top,make("p","eyebrow",project.category.toUpperCase()),make("h3","",project.title),make("p","","A place to record progress, next steps and lessons learned."));
      const actions = make("div","card-actions");
      const select = make("select"); select.setAttribute("aria-label","Update project status");
      ["Planning","In progress","Completed"].forEach(s => { const opt=make("option","",s); opt.value=s; opt.selected=s===project.status; select.append(opt); });
      select.addEventListener("change",()=>{project.status=select.value;persist("Project status updated.");renderProjects();});
      const del=make("button","delete-button","Remove"); del.type="button"; del.addEventListener("click",()=>{if(confirm("Remove this project?")){data.projects=data.projects.filter(p=>p.id!==project.id);persist("Project removed.");renderProjects();}});
      actions.append(select,del); card.append(actions); grid.append(card);
    });
  }
  $("#projectForm").addEventListener("submit",e=>{
    e.preventDefault();const title=$("#projectTitle").value.trim();if(!title)return;
    data.projects.unshift({id:id(),title,category:$("#projectCategory").value,status:$("#projectStatus").value});
    $("#projectForm").reset();persist("Project added.");renderProjects();
  });

  function renderEvents() {
    const list=$("#eventList");list.replaceChildren();
    const events=[...data.events].sort((a,b)=>a.date.localeCompare(b.date));
    if(!events.length){list.append(make("div","empty-state","No dates added yet. Add a deadline or important event above."));return;}
    events.forEach(event=>{
      const row=make("div","event-row"),date=make("div","event-date");
      const parsed=event.date ? event.date.split("-").map(Number) : [];
      date.append(make("strong","",parsed.length===3?String(parsed[2]).padStart(2,"0"):"—"),make("small","",parsed.length===3?new Date(parsed[0],parsed[1]-1,parsed[2]).toLocaleDateString("en-IN",{month:"short"}):"DATE"));
      const info=make("div","event-info");info.append(make("strong","",event.title),make("small","",`${event.type} · ${formatDate(event.date)}`));
      const del=make("button","delete-button","Remove");del.type="button";del.addEventListener("click",()=>{data.events=data.events.filter(x=>x.id!==event.id);persist("Calendar item removed.");renderEvents();});
      row.append(date,info,del);list.append(row);
    });
  }
  $("#eventForm").addEventListener("submit",e=>{
    e.preventDefault();const title=$("#eventTitle").value.trim(),date=$("#eventDate").value;if(!title||!date)return;
    data.events.push({id:id(),title,date,type:$("#eventType").value});$("#eventForm").reset();persist("Calendar item added.");renderEvents();
  });
  function renderUpcoming() {
    const list=$("#upcomingList"); if(!list)return;list.replaceChildren();
    const today=todayKey();
    const events=data.events.filter(e=>e.date>=today).map(e=>({...e,kind:"Event"}));
    const tasks=data.tasks.filter(t=>!t.completed&&t.due&&t.due>=today).map(t=>({...t,title:t.title,date:t.due,kind:"Task"}));
    const upcoming=[...events,...tasks].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
    if(!upcoming.length){list.append(make("div","empty-state","No upcoming deadlines. Add a task due date or calendar event."));return;}
    upcoming.forEach(item=>{
      const row=make("div","compact-item"),parts=item.date.split("-").map(Number),chip=make("div","date-chip");
      chip.append(make("strong","",String(parts[2]).padStart(2,"0")),make("span","",new Date(parts[0],parts[1]-1,parts[2]).toLocaleDateString("en-IN",{month:"short"}).toUpperCase()));
      const info=make("div");info.append(make("strong","",item.title),make("small","",`${item.kind} · ${formatDate(item.date)}`));row.append(chip,info);list.append(row);
    });
  }

  function renderHabits() {
    const list=$("#habitList");list.replaceChildren();
    if(!data.habits.length){list.append(make("div","empty-state","Add a small daily habit to start building consistency."));return;}
    data.habits.forEach(habit=>{
      if(!Array.isArray(habit.checks))habit.checks=[];
      const row=make("label","habit-row"+(habit.checks.includes(todayKey())?" checked":""));
      const check=make("input");check.type="checkbox";check.checked=habit.checks.includes(todayKey());
      check.addEventListener("change",()=>{
        if(check.checked&&!habit.checks.includes(todayKey()))habit.checks.push(todayKey());
        else habit.checks=habit.checks.filter(d=>d!==todayKey());
        persist(check.checked?"Habit checked in.":"Habit check-in removed.");renderHabits();
      });
      const name=make("span","habit-name",habit.title);
      const streak=make("span","habit-streak",`${habit.checks.length} check-ins`);
      const del=make("button","delete-button","×");del.type="button";del.setAttribute("aria-label","Remove habit");
      del.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();data.habits=data.habits.filter(h=>h.id!==habit.id);persist("Habit removed.");renderHabits();});
      row.append(check,name,streak,del);list.append(row);
    });
  }
  $("#habitForm").addEventListener("submit",e=>{
    e.preventDefault();const title=$("#habitTitle").value.trim();if(!title)return;
    data.habits.push({id:id(),title,checks:[]});$("#habitForm").reset();persist("Habit added.");renderHabits();
  });

  function renderNotes() {
    const grid=$("#notesGrid");grid.replaceChildren();
    if(!data.notes.length){grid.append(make("div","empty-state","Your notebook is empty. Save a thought above."));return;}
    [...data.notes].sort((a,b)=>b.updated.localeCompare(a.updated)).forEach(note=>{
      const card=make("article","note-card"),del=make("button","delete-button","Delete");
      del.type="button";del.addEventListener("click",()=>{if(confirm("Delete this note?")){data.notes=data.notes.filter(n=>n.id!==note.id);persist("Note deleted.");renderNotes();}});
      card.append(del,make("h3","",note.title),make("p","",note.body),make("small","",`Updated ${formatDate(note.updated)}`));grid.append(card);
    });
  }
  $("#noteForm").addEventListener("submit",e=>{
    e.preventDefault();const title=$("#noteTitle").value.trim(),body=$("#noteBody").value.trim();if(!title||!body)return;
    data.notes.unshift({id:id(),title,body,updated:todayKey()});$("#noteForm").reset();persist("Note saved in this browser.");renderNotes();
  });

  $("#exportButton").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),owner:"Priyanka Jegadeeshkumar",...data},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=make("a");a.href=url;a.download="priyanka-personal-desk-backup.json";document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);toast("Workspace backup downloaded.");
  });

  const sectionNames={overview:"OVERVIEW",tasks:"TASKS",projects:"PROJECTS",calendar:"CALENDAR",habits:"HABITS",notes:"NOTES",portfolio:"PORTFOLIO"};
  const navLinks=[...document.querySelectorAll(".nav-item")];
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    const id=visible.target.id;
    if(sectionNames[id])$("#currentSection").textContent=sectionNames[id];
    navLinks.forEach(link=>link.classList.toggle("active",link.getAttribute("href")==="#"+id));
  },{rootMargin:"-20% 0px -65% 0px",threshold:[0,.2,.5]});
  document.querySelectorAll("main section[id], main section:not([id])").forEach(section=>{if(section.id)observer.observe(section);});

  initDate();
  renderTasks();renderProjects();renderEvents();renderHabits();renderNotes();updateOverview();
})();
