const STORAGE_KEYS = {
  items: "items",
  reports: "reports",
  activeWeekStart: "activeWeekStart"
};

const DAYS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật"
];

const currencyFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const todayWeekStart = getWeekStart(new Date());
const initialActiveWeekStart = normalizeWeekStart(localStorage.getItem(STORAGE_KEYS.activeWeekStart) || todayWeekStart);
const state = {
  items: loadArray(STORAGE_KEYS.items).map(normalizeItem),
  reports: loadArray(STORAGE_KEYS.reports).map(normalizeReport),
  activeWeekStart: initialActiveWeekStart,
  editingItemId: null,
  editingReportId: null
};

const dom = {
  weekStart: document.querySelector("#weekStart"),
  weekRange: document.querySelector("#weekRange"),
  currentWeek: document.querySelector("#currentWeek"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  itemForm: document.querySelector("#itemForm"),
  itemName: document.querySelector("#itemName"),
  itemPrice: document.querySelector("#itemPrice"),
  cancelItemEdit: document.querySelector("#cancelItemEdit"),
  itemMessage: document.querySelector("#itemMessage"),
  itemList: document.querySelector("#itemList"),
  reportForm: document.querySelector("#reportForm"),
  day: document.querySelector("#day"),
  itemSelect: document.querySelector("#itemSelect"),
  qty: document.querySelector("#qty"),
  copyFromDay: document.querySelector("#copyFromDay"),
  copyToDay: document.querySelector("#copyToDay"),
  copyDayReports: document.querySelector("#copyDayReports"),
  cancelReportEdit: document.querySelector("#cancelReportEdit"),
  reportMessage: document.querySelector("#reportMessage"),
  weekTotal: document.querySelector("#weekTotal"),
  statRows: document.querySelector("#statRows"),
  statItems: document.querySelector("#statItems"),
  statBestDay: document.querySelector("#statBestDay"),
  reportView: document.querySelector("#reportView"),
  exportTxt: document.querySelector("#exportTxt"),
  exportCsv: document.querySelector("#exportCsv"),
  backupData: document.querySelector("#backupData"),
  restoreData: document.querySelector("#restoreData"),
  clearReports: document.querySelector("#clearReports"),
  clearAll: document.querySelector("#clearAll")
};

function loadArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateInputValue(date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function parseDateInput(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day, 12);
}

function getWeekStart(date) {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return toDateInputValue(copy);
}

function normalizeWeekStart(value) {
  return getWeekStart(parseDateInput(value));
}

function getWeekEnd(weekStart) {
  const end = parseDateInput(weekStart);
  end.setDate(end.getDate() + 6);
  return toDateInputValue(end);
}

function formatDate(value) {
  return dateFormatter.format(parseDateInput(value));
}

function normalizeItem(item) {
  return {
    id: item.id || createId("item"),
    name: String(item.name || "").trim(),
    price: Number(item.price) || 0
  };
}

function normalizeReport(report) {
  const quantity = Number(report.quantity || report.q) || 0;
  const total = Number(report.total || report.t) || 0;
  const unitPrice = Number(report.unitPrice || 0) || (quantity > 0 ? total / quantity : 0);

  return {
    id: report.id || createId("report"),
    weekStart: normalizeWeekStart(report.weekStart || initialActiveWeekStart),
    day: report.day || report.d || DAYS[0],
    itemName: report.itemName || report.n || "",
    quantity,
    unitPrice,
    total
  };
}

function save() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
  localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(state.reports));
  localStorage.setItem(STORAGE_KEYS.activeWeekStart, state.activeWeekStart);
}

function formatMoney(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function getCurrentReports() {
  return state.reports.filter((report) => report.weekStart === state.activeWeekStart);
}

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function clearMessages() {
  setMessage(dom.itemMessage, "");
  setMessage(dom.reportMessage, "");
}

function renderDayOptions() {
  dom.day.replaceChildren();
  dom.copyFromDay.replaceChildren();
  dom.copyToDay.replaceChildren();
  DAYS.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    dom.day.append(option);

    const fromOption = option.cloneNode(true);
    const toOption = option.cloneNode(true);
    dom.copyFromDay.append(fromOption);
    dom.copyToDay.append(toOption);
  });

  dom.copyFromDay.value = DAYS[0];
  dom.copyToDay.value = DAYS[1];
}

function renderWeekControls() {
  dom.weekStart.value = state.activeWeekStart;
  dom.weekRange.textContent = `Từ ${formatDate(state.activeWeekStart)} đến ${formatDate(getWeekEnd(state.activeWeekStart))}`;
}

function renderItems() {
  dom.itemList.replaceChildren();

  if (!state.items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Chưa có mặt hàng nào.";
    dom.itemList.append(empty);
    return;
  }

  const table = createTable(["Tên mặt hàng", "Đơn giá", "Thao tác"]);
  state.items.forEach((item) => {
    const row = document.createElement("tr");
    row.append(
      createCell("Tên mặt hàng", item.name),
      createCell("Đơn giá", formatMoney(item.price), "number"),
      createActionCell([
        createSmallButton("Sửa", () => startEditItem(item.id)),
        createSmallButton("Xóa", () => deleteItem(item.id), "danger")
      ])
    );
    table.tBodies[0].append(row);
  });

  dom.itemList.append(table);
}

function renderItemSelect() {
  const currentValue = dom.itemSelect.value;
  const editingReport = state.reports.find((report) => report.id === state.editingReportId);
  const usedItemNames = getCurrentReports()
    .filter((report) => report.day === dom.day.value && report.id !== state.editingReportId)
    .map((report) => report.itemName);
  const availableItems = state.items.filter((item) => !usedItemNames.includes(item.name) || item.name === editingReport?.itemName);

  dom.itemSelect.replaceChildren();

  if (!state.items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Chưa có mặt hàng nào";
    dom.itemSelect.append(option);
    dom.itemSelect.disabled = false;
    return;
  }

  if (!availableItems.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Ngày này đã nhập hết mặt hàng";
    dom.itemSelect.append(option);
    dom.itemSelect.disabled = false;
    return;
  }

  availableItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} - ${formatMoney(item.price)}`;
    dom.itemSelect.append(option);
  });

  if (availableItems.some((item) => item.id === currentValue)) {
    dom.itemSelect.value = currentValue;
  }

  dom.itemSelect.disabled = availableItems.length === 0;
}

function renderReport() {
  dom.reportView.replaceChildren();
  const currentReports = getCurrentReports();
  const total = currentReports.reduce((sum, report) => sum + report.total, 0);
  dom.weekTotal.textContent = formatMoney(total);
  renderStats(currentReports);

  if (!currentReports.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Chưa có dữ liệu báo cáo trong tuần này.";
    dom.reportView.append(empty);
    return;
  }

  DAYS.forEach((day) => {
    const reportsByDay = currentReports.filter((report) => report.day === day);
    if (!reportsByDay.length) {
      return;
    }

    const block = document.createElement("div");
    block.className = "day-block";

    const heading = document.createElement("h3");
    heading.textContent = day;
    block.append(heading);

    const table = createTable(["Số lượng", "Mặt hàng", "Đơn giá", "Thành tiền", "Thao tác"]);
    reportsByDay.forEach((report) => {
      const row = document.createElement("tr");
      row.append(
        createCell("Số lượng", String(report.quantity), "number"),
        createCell("Mặt hàng", report.itemName),
        createCell("Đơn giá", formatMoney(report.unitPrice), "number"),
        createCell("Thành tiền", formatMoney(report.total), "number"),
        createActionCell([
          createSmallButton("Sửa", () => startEditReport(report.id)),
          createSmallButton("Xóa", () => deleteReport(report.id), "danger")
        ])
      );
      table.tBodies[0].append(row);
    });

    block.append(table);
    dom.reportView.append(block);
  });
}

function renderStats(currentReports) {
  const uniqueItems = new Set(currentReports.map((report) => report.itemName));
  const totalsByDay = DAYS.map((day) => ({
    day,
    total: currentReports
      .filter((report) => report.day === day)
      .reduce((sum, report) => sum + report.total, 0)
  }));
  const bestDay = totalsByDay.reduce((best, entry) => (entry.total > best.total ? entry : best), { day: "-", total: 0 });

  dom.statRows.textContent = String(currentReports.length);
  dom.statItems.textContent = String(uniqueItems.size);
  dom.statBestDay.textContent = bestDay.total > 0 ? bestDay.day : "-";
}

function createTable(headers) {
  const table = document.createElement("table");
  table.className = "table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.append(th);
  });
  thead.append(headerRow);

  table.append(thead, document.createElement("tbody"));
  return table;
}

function createCell(label, text, className = "") {
  const cell = document.createElement("td");
  cell.dataset.label = label;
  cell.textContent = text;
  if (className) {
    cell.className = className;
  }
  return cell;
}

function createActionCell(buttons) {
  const cell = document.createElement("td");
  cell.dataset.label = "Thao tác";

  const wrapper = document.createElement("div");
  wrapper.className = "row-actions";
  buttons.forEach((button) => wrapper.append(button));
  cell.append(wrapper);
  return cell;
}

function createSmallButton(text, onClick, type = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `small-btn ${type}`.trim();
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function handleItemSubmit(event) {
  event.preventDefault();
  clearMessages();

  const name = dom.itemName.value.trim();
  const price = Number(dom.itemPrice.value);

  if (!name) {
    setMessage(dom.itemMessage, "Vui lòng nhập tên mặt hàng.", "error");
    return;
  }

  if (!Number.isFinite(price) || price <= 0) {
    setMessage(dom.itemMessage, "Đơn giá phải là số lớn hơn 0.", "error");
    return;
  }

  const duplicate = state.items.find((item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== state.editingItemId);
  if (duplicate) {
    setMessage(dom.itemMessage, "Tên mặt hàng đã tồn tại.", "error");
    return;
  }

  if (state.editingItemId) {
    const item = state.items.find((entry) => entry.id === state.editingItemId);
    item.name = name;
    item.price = price;
    setMessage(dom.itemMessage, "Đã cập nhật mặt hàng. Báo cáo cũ vẫn giữ đơn giá tại thời điểm đã nhập.", "ok");
  } else {
    state.items.push({ id: createId("item"), name, price });
    setMessage(dom.itemMessage, "Đã thêm mặt hàng.", "ok");
  }

  resetItemForm();
  save();
  renderAll();
}

function startEditItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  state.editingItemId = id;
  dom.itemName.value = item.name;
  dom.itemPrice.value = item.price;
  dom.cancelItemEdit.hidden = false;
  dom.itemName.focus();
}

function resetItemForm() {
  state.editingItemId = null;
  dom.itemForm.reset();
  dom.cancelItemEdit.hidden = true;
}

function deleteItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  const used = state.reports.some((report) => report.itemName === item.name);
  const message = used
    ? `Mặt hàng "${item.name}" đã có trong báo cáo cũ. Xóa khỏi danh sách mặt hàng nhưng báo cáo cũ vẫn được giữ?`
    : `Xóa mặt hàng "${item.name}"?`;

  if (!confirm(message)) {
    return;
  }

  state.items = state.items.filter((entry) => entry.id !== id);
  if (state.editingItemId === id) {
    resetItemForm();
  }

  save();
  renderAll();
  setMessage(dom.itemMessage, "Đã xóa mặt hàng.", "ok");
}

function handleReportSubmit(event) {
  event.preventDefault();
  clearMessages();

  const item = state.items.find((entry) => entry.id === dom.itemSelect.value);
  const quantity = Number(dom.qty.value);

  if (!item) {
    setMessage(dom.reportMessage, "Ngày này chưa còn mặt hàng nào để nhập. Hãy chọn ngày khác hoặc thêm mặt hàng mới.", "error");
    return;
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    setMessage(dom.reportMessage, "Số lượng phải là số lớn hơn 0.", "error");
    return;
  }

  const reportData = {
    weekStart: state.activeWeekStart,
    day: dom.day.value,
    itemName: item.name,
    quantity,
    unitPrice: item.price,
    total: quantity * item.price
  };

  if (state.editingReportId) {
    const report = state.reports.find((entry) => entry.id === state.editingReportId);
    Object.assign(report, reportData);
    setMessage(dom.reportMessage, "Đã cập nhật dòng báo cáo.", "ok");
  } else {
    state.reports.push({ id: createId("report"), ...reportData });
    setMessage(dom.reportMessage, "Đã thêm dòng báo cáo.", "ok");
  }

  resetReportForm({ keepDay: true });
  save();
  renderAll();
}

function startEditReport(id) {
  const report = state.reports.find((entry) => entry.id === id);
  if (!report) {
    return;
  }

  const item = state.items.find((entry) => entry.name === report.itemName);
  if (!item) {
    setMessage(dom.reportMessage, "Mặt hàng này không còn trong danh sách. Hãy thêm lại mặt hàng trước khi sửa.", "error");
    return;
  }

  state.editingReportId = id;
  state.activeWeekStart = report.weekStart;
  dom.day.value = report.day;
  dom.itemSelect.value = item.id;
  dom.qty.value = report.quantity;
  dom.cancelReportEdit.hidden = false;
  save();
  renderAll();
  dom.qty.focus();
}

function resetReportForm(options = {}) {
  const selectedDay = dom.day.value;
  state.editingReportId = null;
  dom.reportForm.reset();
  dom.day.value = options.keepDay ? selectedDay : DAYS[0];
  dom.cancelReportEdit.hidden = true;
}

function deleteReport(id) {
  if (!confirm("Xóa dòng báo cáo này?")) {
    return;
  }

  state.reports = state.reports.filter((report) => report.id !== id);
  if (state.editingReportId === id) {
    resetReportForm();
  }

  save();
  renderAll();
  setMessage(dom.reportMessage, "Đã xóa dòng báo cáo.", "ok");
}

function copyDayReports() {
  clearMessages();

  const fromDay = dom.copyFromDay.value;
  const toDay = dom.copyToDay.value;

  if (fromDay === toDay) {
    setMessage(dom.reportMessage, "Ngày nguồn và ngày đích phải khác nhau.", "error");
    return;
  }

  const currentReports = getCurrentReports();
  const sourceReports = currentReports.filter((report) => report.day === fromDay);
  if (!sourceReports.length) {
    setMessage(dom.reportMessage, `Không có dữ liệu ở ${fromDay} để sao chép.`, "error");
    return;
  }

  const existingNames = currentReports
    .filter((report) => report.day === toDay)
    .map((report) => report.itemName);

  const reportsToCopy = sourceReports.filter((report) => !existingNames.includes(report.itemName));
  if (!reportsToCopy.length) {
    setMessage(dom.reportMessage, `${toDay} đã có đủ các mặt hàng từ ${fromDay}.`, "error");
    return;
  }

  reportsToCopy.forEach((report) => {
    state.reports.push({
      ...report,
      id: createId("report"),
      day: toDay,
      weekStart: state.activeWeekStart
    });
  });

  save();
  renderAll();
  setMessage(dom.reportMessage, `Đã sao chép ${reportsToCopy.length} dòng từ ${fromDay} sang ${toDay}.`, "ok");
}

function clearReports() {
  if (!confirm("Xóa báo cáo của tuần đang chọn? Danh sách mặt hàng vẫn được giữ.")) {
    return;
  }

  state.reports = state.reports.filter((report) => report.weekStart !== state.activeWeekStart);
  resetReportForm();
  save();
  renderAll();
}

function clearAll() {
  if (!confirm("Xóa toàn bộ mặt hàng và báo cáo của mọi tuần?")) {
    return;
  }

  state.items = [];
  state.reports = [];
  state.activeWeekStart = todayWeekStart;
  resetItemForm();
  resetReportForm();
  save();
  renderAll();
}

function buildReportLines() {
  const lines = [`Tuần: ${formatDate(state.activeWeekStart)} - ${formatDate(getWeekEnd(state.activeWeekStart))}`, ""];
  const currentReports = getCurrentReports();

  DAYS.forEach((day) => {
    const reportsByDay = currentReports.filter((report) => report.day === day);
    if (!reportsByDay.length) {
      return;
    }

    lines.push(day);
    reportsByDay.forEach((report) => {
      lines.push(`${report.quantity} ${report.itemName}: ${formatMoney(report.total)}`);
    });
    lines.push("");
  });

  const total = currentReports.reduce((sum, report) => sum + report.total, 0);
  lines.push(`Tổng tiền: ${formatMoney(total)}`);
  return lines;
}

function exportTxt() {
  const fileDate = state.activeWeekStart.replaceAll("-", "");
  downloadFile(`GiayTinhTien-${fileDate}.txt`, buildReportLines().join("\n"), "text/plain;charset=utf-8");
}

function exportCsv() {
  const rows = [[`Tuần: ${formatDate(state.activeWeekStart)} - ${formatDate(getWeekEnd(state.activeWeekStart))}`]];
  rows.push([]);

  DAYS.forEach((day) => {
    const reportsByDay = getCurrentReports().filter((report) => report.day === day);
    if (!reportsByDay.length) {
      return;
    }

    rows.push([day]);
    reportsByDay.forEach((report) => {
      rows.push([report.quantity, report.itemName, report.total]);
    });
    rows.push([]);
  });

  const total = getCurrentReports().reduce((sum, report) => sum + report.total, 0);
  rows.push(["", "Tổng tiền", total]);

  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  const fileDate = state.activeWeekStart.replaceAll("-", "");
  downloadFile(`GiayTinhTien-${fileDate}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
}

function escapeCsvValue(value) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function backupData() {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    activeWeekStart: state.activeWeekStart,
    items: state.items,
    reports: state.reports
  };

  downloadFile("QuanLyBanHang-backup.json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

function restoreData(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data.items) || !Array.isArray(data.reports)) {
        throw new Error("Invalid backup");
      }

      state.items = data.items.map(normalizeItem).filter((item) => item.name && item.price > 0);
      state.activeWeekStart = normalizeWeekStart(data.activeWeekStart || todayWeekStart);
      state.reports = data.reports.map(normalizeReport).filter((report) => report.itemName && report.quantity > 0);
      resetItemForm();
      resetReportForm();
      save();
      renderAll();
      setMessage(dom.reportMessage, "Đã khôi phục dữ liệu từ JSON.", "ok");
    } catch {
      setMessage(dom.reportMessage, "File JSON không đúng định dạng sao lưu.", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderAll() {
  renderWeekControls();
  renderItems();
  renderItemSelect();
  renderReport();
}

function bindEvents() {
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      switchTab(button.dataset.tabTarget);
    });
  });

  dom.weekStart.addEventListener("change", () => {
    state.activeWeekStart = normalizeWeekStart(dom.weekStart.value);
    resetReportForm();
    save();
    renderAll();
  });

  dom.currentWeek.addEventListener("click", () => {
    state.activeWeekStart = todayWeekStart;
    resetReportForm();
    save();
    renderAll();
  });

  dom.itemForm.addEventListener("submit", handleItemSubmit);
  dom.cancelItemEdit.addEventListener("click", () => {
    resetItemForm();
    setMessage(dom.itemMessage, "Đã hủy sửa mặt hàng.");
  });

  dom.reportForm.addEventListener("submit", handleReportSubmit);
  dom.day.addEventListener("change", () => {
    renderItemSelect();
  });
  dom.copyDayReports.addEventListener("click", copyDayReports);

  dom.cancelReportEdit.addEventListener("click", () => {
    resetReportForm();
    renderItemSelect();
    setMessage(dom.reportMessage, "Đã hủy sửa dòng báo cáo.");
  });

  dom.exportTxt.addEventListener("click", exportTxt);
  dom.exportCsv.addEventListener("click", exportCsv);
  dom.backupData.addEventListener("click", backupData);
  dom.restoreData.addEventListener("change", restoreData);
  dom.clearReports.addEventListener("click", clearReports);
  dom.clearAll.addEventListener("click", clearAll);
}

function switchTab(targetId) {
  dom.tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === targetId;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  dom.tabPanels.forEach((panel) => {
    const active = panel.id === targetId;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function init() {
  renderDayOptions();
  bindEvents();
  save();
  renderAll();
  registerServiceWorker();
}

init();
