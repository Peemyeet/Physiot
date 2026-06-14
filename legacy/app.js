(function () {
  "use strict";

  const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat"];
  const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00",
  ];
  const STORAGE_KEY = "physiot-schedule-v1";

  const THAI_MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  let currentDate = new Date();
  let data = loadData();
  let editingClassId = null;
  let pendingTasks = [];

  const $ = (sel) => document.querySelector(sel);

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getMonthData() {
    const key = monthKey(currentDate);
    if (!data[key]) {
      data[key] = { classes: [] };
    }
    return data[key];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatThaiMonth(date) {
    return `${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
  }

  function getWeekDatesInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const startMonday = new Date(firstDay);
    startMonday.setDate(firstDay.getDate() - mondayOffset);

    const weeks = [];
    let cursor = new Date(startMonday);

    while (cursor <= lastDay || weeks.length === 0) {
      const week = [];
      for (let i = 0; i < 6; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      const hasDayInMonth = week.some((d) => d.getMonth() === month);
      if (hasDayInMonth) weeks.push(week);
      if (cursor.getMonth() > month && cursor.getDate() > 7) break;
      if (weeks.length > 6) break;
    }

    return weeks;
  }

  function getRepresentativeDates() {
    const weeks = getWeekDatesInMonth(currentDate);
    if (!weeks.length) return DAY_KEYS.map(() => null);
    const week = weeks[0];
    return week.slice(0, 6);
  }

  function isToday(d) {
    const t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
  }

  function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  function classInSlot(cls, slotTime) {
    const slotMin = timeToMinutes(slotTime);
    const startMin = timeToMinutes(cls.start);
    const endMin = timeToMinutes(cls.end);
    return slotMin >= startMin && slotMin < endMin;
  }

  function classStartsAtSlot(cls, slotTime) {
    return cls.start === slotTime;
  }

  function showToast(title, message, type = "task") {
    const container = $("#toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${type === "task" ? "📋" : "✅"}</span>
      <div class="toast__content">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(message)}</p>
      </div>
      <button type="button" class="toast__close" aria-label="ปิด">×</button>
    `;

    const close = () => {
      toast.classList.add("toast--out");
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector(".toast__close").addEventListener("click", close);
    container.appendChild(toast);
    setTimeout(close, 5000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderSchedule() {
    const grid = $("#scheduleGrid");
    const monthData = getMonthData();
    const dates = getRepresentativeDates();

    $("#monthLabel").textContent = formatThaiMonth(currentDate);

    grid.innerHTML = "";

    const corner = document.createElement("div");
    corner.className = "schedule-grid__corner";
    grid.appendChild(corner);

    dates.forEach((d, i) => {
      const dayEl = document.createElement("div");
      dayEl.className = "schedule-grid__day";
      if (d && d.getMonth() === currentDate.getMonth()) {
        dayEl.innerHTML = `${DAYS[i]}<small>${d.getDate()} ${THAI_MONTHS[d.getMonth()].slice(0, 3)}</small>`;
      } else {
        dayEl.textContent = DAYS[i];
      }
      grid.appendChild(dayEl);
    });

    const slotRows = [];
    for (let i = 0; i < TIME_SLOTS.length - 1; i++) {
      slotRows.push(TIME_SLOTS[i]);
    }

    slotRows.forEach((slot) => {
      const timeEl = document.createElement("div");
      timeEl.className = "schedule-grid__time";
      timeEl.textContent = slot;
      grid.appendChild(timeEl);

      DAY_KEYS.forEach((dayKey, dayIndex) => {
        const cell = document.createElement("div");
        cell.className = "schedule-grid__cell";
        const repDate = dates[dayIndex];
        if (repDate && isToday(repDate)) {
          cell.classList.add("schedule-grid__cell--today");
        }

        const classesHere = monthData.classes.filter(
          (c) => c.day === dayKey && classStartsAtSlot(c, slot)
        );

        classesHere.forEach((cls) => {
          const card = document.createElement("div");
          card.className = `class-card class-card--${cls.type}`;
          const taskCount = (cls.tasks || []).length;
          card.innerHTML = `
            <div class="class-card__name">${escapeHtml(cls.name)}</div>
            <div class="class-card__meta">${escapeHtml(cls.start)}–${escapeHtml(cls.end)}</div>
            ${cls.location ? `<div class="class-card__meta">📍 ${escapeHtml(cls.location)}</div>` : ""}
            ${taskCount ? `<span class="class-card__badge">${taskCount} งาน</span>` : ""}
          `;
          card.addEventListener("click", (e) => {
            e.stopPropagation();
            openClassModal(cls.id);
          });
          cell.appendChild(card);
        });

        cell.addEventListener("click", () => {
          openClassModal(null, { day: dayKey, start: slot });
        });

        grid.appendChild(cell);
      });
    });

    renderUpcomingTasks();
  }

  function renderUpcomingTasks() {
    const list = $("#upcomingTasks");
    const empty = $("#noTasksMsg");
    const monthData = getMonthData();

    const allTasks = [];
    monthData.classes.forEach((cls) => {
      (cls.tasks || []).forEach((task) => {
        allTasks.push({ ...task, courseName: cls.name, courseId: cls.id });
      });
    });

    allTasks.sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });

    list.innerHTML = "";

    if (!allTasks.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    allTasks.slice(0, 8).forEach((task) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div>${escapeHtml(task.title)}</div>
        <div class="task-list__course">${escapeHtml(task.courseName)}</div>
        ${task.due ? `<div class="task-list__due">📅 กำหนดส่ง: ${formatDateThai(task.due)}</div>` : ""}
      `;
      li.style.cursor = "pointer";
      li.addEventListener("click", () => openClassModal(task.courseId));
      list.appendChild(li);
    });
  }

  function formatDateThai(iso) {
    const d = new Date(iso + "T00:00:00");
    return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  }

  function populateTimeSelects() {
    const start = $("#courseStart");
    const end = $("#courseEnd");
    start.innerHTML = "";
    end.innerHTML = "";
    TIME_SLOTS.forEach((t) => {
      start.appendChild(new Option(t, t));
      end.appendChild(new Option(t, t));
    });
    end.value = "10:00";
  }

  function populateDaySelect() {
    const sel = $("#courseDay");
    sel.innerHTML = "";
    DAY_KEYS.forEach((key, i) => {
      sel.appendChild(new Option(DAYS[i], key));
    });
  }

  function renderPendingTasks() {
    const container = $("#tasksContainer");
    container.innerHTML = "";

    pendingTasks.forEach((task, index) => {
      const el = document.createElement("div");
      el.className = "task-item";
      el.innerHTML = `
        <div>
          <div class="task-item__title">${escapeHtml(task.title)}</div>
          ${task.detail ? `<div class="task-item__detail">${escapeHtml(task.detail)}</div>` : ""}
          ${task.due ? `<div class="task-item__due">📅 ${formatDateThai(task.due)}</div>` : ""}
        </div>
        <button type="button" class="task-item__remove" data-index="${index}" aria-label="ลบงาน">×</button>
      `;
      el.querySelector(".task-item__remove").addEventListener("click", () => {
        pendingTasks.splice(index, 1);
        renderPendingTasks();
      });
      container.appendChild(el);
    });
  }

  function openClassModal(classId = null, defaults = {}) {
    editingClassId = classId;
    pendingTasks = [];
    const modal = $("#classModal");
    const deleteBtn = $("#btnDeleteClass");

    populateTimeSelects();
    populateDaySelect();

    if (classId) {
      const cls = getMonthData().classes.find((c) => c.id === classId);
      if (!cls) return;

      $("#classModalTitle").textContent = "แก้ไขวิชา";
      $("#classId").value = cls.id;
      $("#courseName").value = cls.name;
      $("#courseDay").value = cls.day;
      $("#courseType").value = cls.type;
      $("#courseStart").value = cls.start;
      $("#courseEnd").value = cls.end;
      $("#courseLocation").value = cls.location || "";
      $("#courseNote").value = cls.note || "";
      pendingTasks = [...(cls.tasks || [])];
      deleteBtn.hidden = false;
    } else {
      $("#classModalTitle").textContent = "เพิ่มวิชา";
      $("#classForm").reset();
      $("#classId").value = "";
      if (defaults.day) $("#courseDay").value = defaults.day;
      if (defaults.start) {
        $("#courseStart").value = defaults.start;
        const startIdx = TIME_SLOTS.indexOf(defaults.start);
        if (startIdx >= 0 && startIdx + 4 < TIME_SLOTS.length) {
          $("#courseEnd").value = TIME_SLOTS[startIdx + 4];
        }
      }
      deleteBtn.hidden = true;
    }

    renderPendingTasks();
    modal.showModal();
  }

  function closeClassModal() {
    $("#classModal").close();
    editingClassId = null;
    pendingTasks = [];
  }

  function openTaskModal() {
    $("#taskForm").reset();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const today = new Date();
    if (today.getMonth() === month && today.getFullYear() === year) {
      $("#taskDue").value = today.toISOString().slice(0, 10);
    }
    $("#taskModal").showModal();
  }

  function initSampleData() {
    const key = monthKey(currentDate);
    if (data[key]?.classes?.length) return;

    data[key] = {
      classes: [
        {
          id: uid(),
          name: "กายวิภาคศาสตร์และสรีรวิทยา",
          day: "mon",
          type: "lecture",
          start: "09:00",
          end: "12:00",
          location: "ห้อง 201 อาคารเรียนรวม",
          note: "อ.สมชาย — นำชุดแล็บชุดที่ 1",
          tasks: [
            { id: uid(), title: "ทำแบบทดสอบก่อนเรียน บทที่ 3", detail: "ส่งใน LMS ก่อนคาบเรียน", due: "" },
          ],
        },
        {
          id: uid(),
          name: "การประเมินและวินิจฉัย PT",
          day: "wed",
          type: "lab",
          start: "13:00",
          end: "16:00",
          location: "ห้องปฏิบัติการ กายภาพ",
          note: "แต่งกายชุดปฏิบัติ",
          tasks: [],
        },
        {
          id: uid(),
          name: "เทคนิคการบำบัดพื้นฐาน",
          day: "fri",
          type: "lecture",
          start: "10:30",
          end: "12:30",
          location: "ห้อง 305",
          note: "",
          tasks: [],
        },
      ],
    };
    saveData();
  }

  function bindEvents() {
    $("#btnPrevMonth").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderSchedule();
    });

    $("#btnNextMonth").addEventListener("click", () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderSchedule();
    });

    $("#btnAddClass").addEventListener("click", () => openClassModal());

    $("#closeClassModal").addEventListener("click", closeClassModal);
    $("#cancelClassModal").addEventListener("click", closeClassModal);

    $("#closeTaskModal").addEventListener("click", () => $("#taskModal").close());
    $("#cancelTaskModal").addEventListener("click", () => $("#taskModal").close());

    $("#btnAddTask").addEventListener("click", openTaskModal);

    $("#taskForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const title = $("#taskTitle").value.trim();
      const detail = $("#taskDetail").value.trim();
      const due = $("#taskDue").value;

      const task = { id: uid(), title, detail, due };
      pendingTasks.push(task);

      $("#taskModal").close();
      renderPendingTasks();

      const courseName = $("#courseName").value.trim() || "วิชาใหม่";
      showToast(
        "เพิ่มงานใหม่แล้ว!",
        `"${title}" ใน ${courseName}${due ? ` — กำหนดส่ง ${formatDateThai(due)}` : ""}`,
        "task"
      );
    });

    $("#classForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const monthData = getMonthData();

      const payload = {
        id: editingClassId || uid(),
        name: $("#courseName").value.trim(),
        day: $("#courseDay").value,
        type: $("#courseType").value,
        start: $("#courseStart").value,
        end: $("#courseEnd").value,
        location: $("#courseLocation").value.trim(),
        note: $("#courseNote").value.trim(),
        tasks: pendingTasks,
      };

      if (timeToMinutes(payload.end) <= timeToMinutes(payload.start)) {
        showToast("ข้อผิดพลาด", "เวลาสิ้นสุดต้องหลังเวลาเริ่ม", "task");
        return;
      }

      const existingIdx = monthData.classes.findIndex((c) => c.id === payload.id);
      const isNew = existingIdx < 0;

      if (isNew) {
        monthData.classes.push(payload);
        showToast("เพิ่มวิชาแล้ว", `${payload.name} — ${DAYS[DAY_KEYS.indexOf(payload.day)]} ${payload.start}–${payload.end}`, "success");
      } else {
        const oldTasks = monthData.classes[existingIdx].tasks || [];
        const newTaskCount = payload.tasks.length - oldTasks.length;
        monthData.classes[existingIdx] = payload;
        showToast("บันทึกแล้ว", `อัปเดต ${payload.name} เรียบร้อย`, "success");
        if (newTaskCount > 0) {
          const latest = payload.tasks[payload.tasks.length - 1];
          showToast("มีงานใหม่!", `"${latest.title}" ถูกเพิ่มใน ${payload.name}`, "task");
        }
      }

      saveData();
      closeClassModal();
      renderSchedule();
    });

    $("#btnDeleteClass").addEventListener("click", () => {
      if (!editingClassId) return;
      const cls = getMonthData().classes.find((c) => c.id === editingClassId);
      if (!cls) return;
      if (!confirm(`ลบวิชา "${cls.name}" ใช่หรือไม่?`)) return;

      getMonthData().classes = getMonthData().classes.filter((c) => c.id !== editingClassId);
      saveData();
      showToast("ลบแล้ว", `ลบ ${cls.name} ออกจากตาราง`, "success");
      closeClassModal();
      renderSchedule();
    });
  }

  populateTimeSelects();
  populateDaySelect();
  initSampleData();
  bindEvents();
  renderSchedule();
})();
