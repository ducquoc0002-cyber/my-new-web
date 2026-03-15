const STORAGE_KEY = "team-task-board:v1";

const STATUS_LABELS = {
  "todo": "Chưa làm",
  "in-progress": "Đang làm",
  "done": "Hoàn thành",
};

const PRIORITY_LABELS = {
  "high": "Ưu tiên cao",
  "normal": "Trung bình",
  "low": "Thấp",
};

const StateModule = (() => {
  let tasks = [];

  const load = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        tasks = [];
        return tasks;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        tasks = [];
        return tasks;
      }
      tasks = parsed;
      return tasks;
    } catch (error) {
      console.error("Không thể đọc dữ liệu từ LocalStorage:", error);
      tasks = [];
      return tasks;
    }
  };

  const persist = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Không thể lưu dữ liệu vào LocalStorage:", error);
    }
  };

  const getTasks = () => tasks.slice();

  const addTask = (task) => {
    tasks = [...tasks, task];
    persist();
  };

  const updateTask = (id, patch) => {
    tasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            ...patch,
          }
        : task
    );
    persist();
  };

  return {
    load,
    getTasks,
    addTask,
    updateTask,
  };
})();

const DomModule = (() => {
  const selectors = {
    form: "#task-form",
    titleInput: "#task-title",
    ownerInput: "#task-owner",
    prioritySelect: "#task-priority",
    statusSelect: "#task-status",
    dueDateInput: "#task-due-date",
    notesInput: "#task-notes",
    filterStatus: "#filter-status",
    searchText: "#search-text",
    columnTodo: "#column-todo",
    columnInProgress: "#column-in-progress",
    columnDone: "#column-done",
    countTodo: '[data-count-for="todo"]',
    countInProgress: '[data-count-for="in-progress"]',
    countDone: '[data-count-for="done"]',
    appThemeToggle: ".app__theme-toggle",
  };

  const getElement = (selector) => {
    const element = document.querySelector(selector);
    return element || null;
  };

  const getFormElements = () => ({
    form: getElement(selectors.form),
    title: getElement(selectors.titleInput),
    owner: getElement(selectors.ownerInput),
    priority: getElement(selectors.prioritySelect),
    status: getElement(selectors.statusSelect),
    dueDate: getElement(selectors.dueDateInput),
    notes: getElement(selectors.notesInput),
  });

  const getFilterElements = () => ({
    filterStatus: getElement(selectors.filterStatus),
    searchText: getElement(selectors.searchText),
  });

  const getBoardColumns = () => ({
    todo: getElement(selectors.columnTodo),
    inProgress: getElement(selectors.columnInProgress),
    done: getElement(selectors.columnDone),
  });

  const getCounters = () => ({
    todo: getElement(selectors.countTodo),
    inProgress: getElement(selectors.countInProgress),
    done: getElement(selectors.countDone),
  });

  const getThemeToggle = () => getElement(selectors.appThemeToggle);

  const createTaskCard = (task) => {
    const article = document.createElement("article");
    article.className = "task-card";
    article.dataset.taskId = task.id;
    article.dataset.status = task.status;
    article.dataset.priority = task.priority;
    article.dataset.searchText = `${task.title.toLowerCase()} ${task.owner.toLowerCase()}`;

    const initials = (task.owner || "")
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const priorityModifier =
      task.priority === "high"
        ? "task-card__priority--high"
        : task.priority === "low"
        ? "task-card__priority--low"
        : "task-card__priority--normal";

    const statusLabel = STATUS_LABELS[task.status] || "";

    const dueDateText = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        })
      : "Không đặt";

    article.innerHTML = [
      `<div class="task-card__header">`,
      `  <h4 class="task-card__title">${task.title}</h4>`,
      `  <span class="task-card__priority ${priorityModifier}">${PRIORITY_LABELS[task.priority] || ""}</span>`,
      `</div>`,
      `<div class="task-card__meta">`,
      `  <div class="task-card__owner">`,
      `    <span class="task-card__avatar">${initials || "TV"}</span>`,
      `    <span class="task-card__owner-name">${task.owner}</span>`,
      `  </div>`,
      `  <div class="task-card__due">`,
      `    <span class="task-card__due-pill">${dueDateText}</span>`,
      `  </div>`,
      `</div>`,
      `<div class="task-card__status task-card__status--${task.status}" data-role="status-toggle">`,
      `  <span class="task-card__status-indicator"></span>`,
      `  <span class="task-card__status-label">${statusLabel}</span>`,
      `</div>`,
      task.notes
        ? `<p class="task-card__notes" title="${task.notes}">${task.notes}</p>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    return article;
  };

  const clearBoard = () => {
    const { todo, inProgress, done } = getBoardColumns();
    [todo, inProgress, done].forEach((column) => {
      if (column) {
        column.innerHTML = "";
      }
    });
  };

  const renderTasks = (tasks, filterStatusValue, searchValue) => {
    const { todo, inProgress, done } = getBoardColumns();
    const counters = getCounters();

    if (!todo || !inProgress || !done) {
      return;
    }

    clearBoard();

    let countTodo = 0;
    let countInProgress = 0;
    let countDone = 0;

    const normalizedSearch = searchValue.trim().toLowerCase();

    tasks
      .map((task) => ({ ...task }))
      .forEach((task, index) => {
        const matchesStatus =
          filterStatusValue === "all" ? true : task.status === filterStatusValue;

        const searchSource = `${task.title} ${task.owner}`.toLowerCase();
        const matchesSearch = normalizedSearch.length
          ? searchSource.includes(normalizedSearch)
          : true;

        if (!matchesStatus || !matchesSearch) {
          return;
        }

        const card = createTaskCard(task);

        const slightDelay = Math.min(index * 35, 160);
        card.style.opacity = "0";
        card.style.transform = "translateY(6px) scale(0.99)";

        window.setTimeout(() => {
          card.style.transition = "opacity 0.24s ease-out, transform 0.24s ease-out";
          card.style.opacity = "1";
          card.style.transform = "translateY(0) scale(1)";
        }, slightDelay);

        if (task.status === "todo") {
          todo.appendChild(card);
          countTodo += 1;
        } else if (task.status === "in-progress") {
          inProgress.appendChild(card);
          countInProgress += 1;
        } else if (task.status === "done") {
          done.appendChild(card);
          countDone += 1;
        }
      });

    if (counters.todo) counters.todo.textContent = String(countTodo);
    if (counters.inProgress) counters.inProgress.textContent = String(countInProgress);
    if (counters.done) counters.done.textContent = String(countDone);
  };

  const setError = (fieldName, message) => {
    const errorElement = document.querySelector(
      `.task-form__error[data-error-for="${fieldName}"]`
    );
    if (!errorElement) return;
    errorElement.textContent = message;
  };

  const clearErrors = () => {
    document.querySelectorAll(".task-form__error").forEach((el) => {
      el.textContent = "";
    });
    document
      .querySelectorAll(
        ".task-form__input, .task-form__select, .task-form__textarea"
      )
      .forEach((el) => {
        el.classList.remove("task-form__input--error");
        el.classList.remove("task-form__select--error");
        el.classList.remove("task-form__textarea--error");
      });
  };

  const markFieldInvalid = (element) => {
    if (!element) return;
    if (element.tagName === "SELECT") {
      element.classList.add("task-form__select--error");
    } else if (element.tagName === "TEXTAREA") {
      element.classList.add("task-form__textarea--error");
    } else {
      element.classList.add("task-form__input--error");
    }
  };

  const toggleTheme = () => {
    document.body.classList.toggle("theme--alt");
  };

  return {
    getFormElements,
    getFilterElements,
    getBoardColumns,
    getThemeToggle,
    renderTasks,
    clearErrors,
    setError,
    markFieldInvalid,
    toggleTheme,
  };
})();

const AppModule = (() => {
  const state = StateModule;
  const dom = DomModule;

  const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const getCurrentFilters = () => {
    const { filterStatus, searchText } = dom.getFilterElements();
    const statusValue = filterStatus ? filterStatus.value : "all";
    const searchValue = searchText ? searchText.value : "";
    return {
      status: statusValue,
      search: searchValue,
    };
  };

  const applyFiltersAndRender = () => {
    const tasks = state.getTasks();
    const { status, search } = getCurrentFilters();
    dom.renderTasks(tasks, status, search);
  };

  const validateForm = () => {
    const { title, owner } = dom.getFormElements();
    dom.clearErrors();

    let isValid = true;

    if (!title || !owner) {
      return false;
    }

    const titleValue = title.value.trim();
    const ownerValue = owner.value.trim();

    if (!titleValue) {
      isValid = false;
      dom.setError("title", "Vui lòng nhập tên nhiệm vụ.");
      dom.markFieldInvalid(title);
    }

    if (!ownerValue) {
      isValid = false;
      dom.setError("owner", "Vui lòng nhập tên người thực hiện.");
      dom.markFieldInvalid(owner);
    }

    return isValid;
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();

    const elements = dom.getFormElements();
    if (!elements.form) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const now = new Date();
    const createdAt = now.toISOString();

    const newTask = {
      id: generateId(),
      title: elements.title.value.trim(),
      owner: elements.owner.value.trim(),
      priority: elements.priority ? elements.priority.value : "normal",
      status: elements.status ? elements.status.value : "todo",
      dueDate: elements.dueDate ? elements.dueDate.value : "",
      notes: elements.notes ? elements.notes.value.trim() : "",
      createdAt,
    };

    state.addTask(newTask);
    applyFiltersAndRender();

    elements.form.reset();
  };

  const getNextStatus = (currentStatus) => {
    if (currentStatus === "todo") return "in-progress";
    if (currentStatus === "in-progress") return "done";
    return "todo";
  };

  const handleBoardClick = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const statusToggle =
      target.closest("[data-role='status-toggle']") || target.closest(".task-card__status");

    if (!statusToggle) {
      return;
    }

    const card = statusToggle.closest(".task-card");
    if (!card) return;

    const taskId = card.dataset.taskId;
    const currentStatus = card.dataset.status;

    if (!taskId || !currentStatus) {
      return;
    }

    const nextStatus = getNextStatus(currentStatus);
    state.updateTask(taskId, { status: nextStatus });
    const { status } = getCurrentFilters();

    if (status === "all" || status === nextStatus) {
      applyFiltersAndRender();
    } else {
      applyFiltersAndRender();
    }
  };

  const handleFiltersChange = () => {
    applyFiltersAndRender();
  };

  const attachEventListeners = () => {
    const { form } = dom.getFormElements();
    const { filterStatus, searchText } = dom.getFilterElements();
    const { todo, inProgress, done } = dom.getBoardColumns();
    const themeToggle = dom.getThemeToggle();

    if (form) {
      form.addEventListener("submit", (event) => {
        try {
          handleFormSubmit(event);
        } catch (error) {
          console.error("Lỗi khi xử lý form:", error);
        }
      });
    }

    if (filterStatus) {
      filterStatus.addEventListener("change", handleFiltersChange);
    }

    if (searchText) {
      searchText.addEventListener("input", () => {
        window.requestAnimationFrame(() => {
          handleFiltersChange();
        });
      });
    }

    const columnContainers = [todo, inProgress, done].filter(Boolean);
    columnContainers.forEach((column) => {
      column.addEventListener("click", (event) => {
        try {
          handleBoardClick(event);
        } catch (error) {
          console.error("Lỗi khi cập nhật trạng thái nhiệm vụ:", error);
        }
      });
    });

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        try {
          dom.toggleTheme();
        } catch (error) {
          console.error("Lỗi khi đổi giao diện:", error);
        }
      });
    }
  };

  const init = () => {
    const initialTasks = state.load();
    if (!Array.isArray(initialTasks)) {
      return;
    }

    attachEventListeners();
    applyFiltersAndRender();
  };

  return {
    init,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  try {
    AppModule.init();
  } catch (error) {
    console.error("Không thể khởi tạo ứng dụng:", error);
  }
});

