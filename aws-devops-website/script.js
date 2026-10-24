
const form = document.getElementById("taskForm");
const input = document.getElementById("taskInput");
const list = document.getElementById("taskList");
const count = document.getElementById("taskCount");

function updateCount() {
    const remaining = [...list.children].filter(
        task => !task.classList.contains("completed")
    ).length;

    count.textContent = `${remaining} tasks remaining`;
}

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const taskName = input.value.trim();
    if (!taskName) return;

    const item = document.createElement("li");
    const label = document.createElement("span");
    const completeButton = document.createElement("button");

    label.textContent = taskName;
    completeButton.textContent = "Complete";

    completeButton.addEventListener("click", function () {
        item.classList.toggle("completed");
        completeButton.textContent =
            item.classList.contains("completed")
                ? "Undo"
                : "Complete";
        updateCount();
    });

    item.append(label, completeButton);
    list.appendChild(item);

    input.value = "";
    updateCount();
});

updateCount();
