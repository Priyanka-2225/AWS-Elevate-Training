
const STORAGE_KEY = "atelier-task-ledger-v1";

const form = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priorityInput");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const clearCompletedButton = document.getElementById("clearCompleted");

let currentFilter = "all";
let tasks = loadTasks();

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(task =>
      task && typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean"
    ) : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    document.getElementById("taskSummary").textContent =
      "Browser storage unavailable. Your tasks may not persist after closing this page.";
  }
}

function updateDate() {
  const today = new Date();
  document.getElementById("todayLabel").textContent =
    today.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric"
    }).toUpperCase();
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const percentage = total ? Math.round(completed / total * 100) : 0;

  document.getElementById("totalCount").textContent = total;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("progressBar").style.width = percentage + "%";
  document.getElementById("progressText").textContent =
    total ? `${percentage}% of your tasks completed` : "Your progress starts here";

  document.getElementById("taskSummary").textContent =
    `${total} ${total === 1 ? "task" : "tasks"} · ${pending} remaining`;

  clearCompletedButton.disabled = completed === 0;
  clearCompletedButton.style.opacity = completed === 0 ? "0.45" : "1";
}

function renderTasks() {
  const query = searchInput.value.trim().toLowerCase();

  const visibleTasks = tasks.filter(task => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);

    return matchesFilter && task.title.toLowerCase().includes(query);
  });

  taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const heading = document.createElement("strong");
    heading.textContent = tasks.length === 0
      ? "A fresh page awaits."
      : "Nothing to show just yet.";

    const message = document.createElement("span");
    message.textContent = tasks.length === 0
      ? "Add your first task above and begin with intention."
      : "Try another filter or search term.";

    empty.append(heading, message);
    taskList.append(empty);
    updateStats();
    return;
  }

  visibleTasks.forEach(task => {
    const row = document.createElement("article");
    row.className = "task-row" + (task.completed ? " is-complete" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", "Mark " + task.title + " complete");

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const content = document.createElement("div");
    const title = document.createElement("p");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = task.completed
      ? "Completed"
      : "Added " + task.createdAt;

    content.append(title, meta);

    const priority = document.createElement("span");
    priority.className = "priority " + task.priority;
    priority.textContent = task.priority;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", "Delete " + task.title);

    remove.addEventListener("click", () => {
      tasks = tasks.filter(item => item.id !== task.id);
      saveTasks();
      renderTasks();
    });

    row.append(checkbox, content, priority, remove);
    taskList.append(row);
  });

  updateStats();
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    title,
    priority: priorityInput.value,
    completed: false,
    createdAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit", month: "short"
    })
  });

  saveTasks();
  taskInput.value = "";
  priorityInput.value = "Normal";
  renderTasks();
  taskInput.focus();
});

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll("[data-filter]").forEach(item => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    renderTasks();
  });
});

searchInput.addEventListener("input", renderTasks);

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter(task => task.completed).length;
  if (completedCount === 0) return;

  const confirmed = window.confirm(
    `Remove ${completedCount} completed task(s)?`
  );

  if (!confirmed) return;

  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  renderTasks();
});

updateDate();
renderTasks();
