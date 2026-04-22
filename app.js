const STORAGE_KEYS = {
  items: "items",
  reports: "reports"
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

const state = {
  items: loadArray(STORAGE_KEYS.items).map(normalizeItem),
  reports: loadArray(STORAGE_KEYS.reports).map(normalizeReport),
  editingItemId: null,
  editingReportId: null
};

const dom = {
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
  cancelReportEdit: document.querySelector("#cancelReportEdit"),
  reportMessage: document.querySelector("#reportMessage"),
  weekTotal: document.querySelector("#weekTotal"),
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
}

function formatMoney(value) {
  return currencyFormatter.format(Number(value) || 0);
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
  DAYS.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    dom.day.append(option);
  });
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
  dom.itemSelect.replaceChildren();

  state.items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} - ${formatMoney(item.price)}`;
    dom.itemSelect.append(option);
  });

  if (state.items.some((item) => item.id === currentValue)) {
    dom.itemSelect.value = currentValue;
  }

  dom.itemSelect.disabled = state.items.length === 0;
}

function renderReport() {
  dom.reportView.replaceChildren();

  const total = state.reports.reduce((sum, report) => sum + report.total, 0);
  dom.weekTotal.textContent = formatMoney(total);

  if (!state.reports.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Chưa có dữ liệu báo cáo.";
    dom.reportView.append(empty);
    return;
  }

  DAYS.forEach((day) => {
    const reportsByDay = state.reports.filter((report) => report.day === day);
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
    setMessage(dom.itemMessage, "Đơn giá phải lớn hơn 0.", "error");
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
    setMessage(dom.reportMessage, "Vui lòng thêm hoặc chọn mặt hàng.", "error");
    return;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    setMessage(dom.reportMessage, "Số lượng phải là số nguyên lớn hơn 0.", "error");
    return;
  }

  const reportData = {
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

  resetReportForm();
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
  dom.day.value = report.day;
  dom.itemSelect.value = item.id;
  dom.qty.value = report.quantity;
  dom.cancelReportEdit.hidden = false;
  dom.qty.focus();
}

function resetReportForm() {
  state.editingReportId = null;
  dom.reportForm.reset();
  dom.day.value = DAYS[0];
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

function clearReports() {
  if (!confirm("Xóa toàn bộ báo cáo tuần? Danh sách mặt hàng vẫn được giữ.")) {
    return;
  }

  state.reports = [];
  resetReportForm();
  save();
  renderAll();
}

function clearAll() {
  if (!confirm("Xóa toàn bộ mặt hàng và báo cáo?")) {
    return;
  }

  state.items = [];
  state.reports = [];
  resetItemForm();
  resetReportForm();
  save();
  renderAll();
}

function buildReportLines() {
  const lines = [];

  DAYS.forEach((day) => {
    const reportsByDay = state.reports.filter((report) => report.day === day);
    if (!reportsByDay.length) {
      return;
    }

    lines.push(day);
    reportsByDay.forEach((report) => {
      lines.push(`${report.quantity} ${report.itemName}: ${formatMoney(report.total)}`);
    });
    lines.push("");
  });

  const total = state.reports.reduce((sum, report) => sum + report.total, 0);
  lines.push(`Tổng tiền: ${formatMoney(total)}`);
  return lines;
}

function exportTxt() {
  downloadFile("GiayTinhTien.txt", buildReportLines().join("\n"), "text/plain;charset=utf-8");
}

function exportCsv() {
  const rows = [["Ngày", "Số lượng", "Mặt hàng", "Thành tiền"]];

  DAYS.forEach((day) => {
    const reportsByDay = state.reports.filter((report) => report.day === day);
    reportsByDay.forEach((report, index) => {
      rows.push([index === 0 ? day : "", report.quantity, report.itemName, report.total]);
    });
  });

  const total = state.reports.reduce((sum, report) => sum + report.total, 0);
  rows.push(["", "", "Tổng tiền", total]);

  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
  downloadFile("GiayTinhTien.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
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
    version: 1,
    exportedAt: new Date().toISOString(),
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
  renderItems();
  renderItemSelect();
  renderReport();
}

function bindEvents() {
  dom.itemForm.addEventListener("submit", handleItemSubmit);
  dom.cancelItemEdit.addEventListener("click", () => {
    resetItemForm();
    setMessage(dom.itemMessage, "Đã hủy sửa mặt hàng.");
  });

  dom.reportForm.addEventListener("submit", handleReportSubmit);
  dom.cancelReportEdit.addEventListener("click", () => {
    resetReportForm();
    setMessage(dom.reportMessage, "Đã hủy sửa dòng báo cáo.");
  });

  dom.exportTxt.addEventListener("click", exportTxt);
  dom.exportCsv.addEventListener("click", exportCsv);
  dom.backupData.addEventListener("click", backupData);
  dom.restoreData.addEventListener("change", restoreData);
  dom.clearReports.addEventListener("click", clearReports);
  dom.clearAll.addEventListener("click", clearAll);
}

function init() {
  renderDayOptions();
  bindEvents();
  save();
  renderAll();
}

init();
