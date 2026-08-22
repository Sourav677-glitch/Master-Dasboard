const role = localStorage.getItem("role");

if (!role) {
  location.href = "index.html";
}

const scriptURL = "https://script.google.com/macros/s/AKfycbwyLnf5LjucQMPEOMEevp3cMWoFLRiicUWJgs-wm9d93eK-sLJWMrHS91NdpGQaojoK/exec";

// --- Global State ---
let allData = [];
let filteredData = [];
let currentPage = 1;
const recordsPerPage = 10;
let editId = null;

// Charts
let completionChart = null;
let cellChart = null;
let problemChart = null;
let cellNewProcurementChart = null;
let monthNewProcurementChart = null;
let monthEntriesChart = null;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const tbody = document.getElementById("tbody");
  const searchBox = document.getElementById("searchBox");
  const statusFilter = document.getElementById("statusFilter");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const clock = document.getElementById("clock");
  const noDataMessage = document.getElementById("noDataMessage");
  const formModeText = document.getElementById("formModeText");

  // Analytics
  const analyticsBtn = document.getElementById("analyticsBtn");
  const analyticsModal = document.getElementById("analyticsModal");
  const closeAnalyticsBtn = document.getElementById("closeAnalyticsBtn");
 const analyticsYearFilter = document.getElementById("analyticsYearFilter");
const analyticsMonthFilter = document.getElementById("analyticsMonthFilter");

  // Inputs
  const receiveInput = document.getElementById("receive");
  const handoverInput = document.getElementById("handover");
  const cellInput = document.getElementById("cell");
  const problemCategoryInput = document.getElementById("problemCategory");
  const problemInput = document.getElementById("problem");
  const solutionInput = document.getElementById("solution");
  const remarksInput = document.getElementById("remarks");
  const serialInput = document.getElementById("serial");

  document.getElementById("logoutBtn").onclick = logout;
  document.getElementById("themeBtn").onclick = () => document.body.classList.toggle("dark");
  document.getElementById("excelBtn").onclick = exportExcel;
  document.getElementById("pdfBtn").onclick = exportPDF;
  document.getElementById("resetBtn").onclick = resetForm;
  document.getElementById("clearFiltersBtn").onclick = clearFilters;
  document.getElementById("closeModalBtn").onclick = closeSuccessModal;

  searchBox.oninput = filterData;
  statusFilter.onchange = filterData;
  fromDate.onchange = filterData;
  toDate.onchange = filterData;

  analyticsBtn.onclick = () => {
  analyticsModal.classList.remove("hidden");
  populateAnalyticsYearFilter();

  if (!analyticsMonthFilter.value) {
    analyticsMonthFilter.value = "ALL";
  }

  updateAnalyticsCharts();
};

  closeAnalyticsBtn.onclick = () => {
    analyticsModal.classList.add("hidden");
  };

  analyticsYearFilter.onchange = () => {
  updateAnalyticsCharts();
};

analyticsMonthFilter.onchange = () => {
  updateAnalyticsCharts();
};
  

  // Close modal if clicked outside
  analyticsModal.addEventListener("click", (e) => {
    if (e.target === analyticsModal) {
      analyticsModal.classList.add("hidden");
    }
  });

  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  };

  nextBtn.onclick = () => {
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  };

  form.onsubmit = e => {
    e.preventDefault();
    save();
  };

  function load() {
    showLoader(true);

    fetch(scriptURL)
      .then(r => r.json())
      .then(data => {
        allData = data.reverse();

        animateCounter("totalCount", allData.length);
        animateCounter("pendingCount", allData.filter(r => (r[10] || "Pending") === "Pending").length);
        animateCounter("completedCount", allData.filter(r => r[10] === "Completed").length);

        updateMostActiveMonth();
        updateQuickSummary();
        filterData();
      })
      .catch(() => {
        showToast("Failed to load data", "error");
      })
      .finally(() => {
        showLoader(false);
      });
  }

  // =========================
  // MOST ACTIVE MONTH (ALL TIME)
  // =========================
  function updateMostActiveMonth() {
    const monthCounts = {};

    allData.forEach(r => {
      if (!r[2]) return;

      const d = new Date(r[2]);
      if (isNaN(d)) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    });

    let maxKey = null;
    let maxCount = 0;

    Object.keys(monthCounts).forEach(key => {
      if (monthCounts[key] > maxCount) {
        maxCount = monthCounts[key];
        maxKey = key;
      }
    });

    const monthEl = document.getElementById("mostActiveMonth");
    const countEl = document.getElementById("mostActiveMonthCount");

    if (!maxKey) {
      if (monthEl) monthEl.innerText = "-";
      if (countEl) countEl.innerText = "0 Entries";
      return;
    }

    const [year, month] = maxKey.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, 1);

    const displayMonth = dateObj.toLocaleString("en-GB", {
      month: "long",
      year: "numeric"
    });

    if (monthEl) monthEl.innerText = displayMonth;
    if (countEl) countEl.innerText = `${maxCount} Entries`;
  }

  // =========================
  // QUICK SUMMARY (LIVE)
  // =========================
  function updateQuickSummary() {
    const topProblemEl = document.getElementById("topProblem");
    const mostActiveCellEl = document.getElementById("mostActiveCell");
    const thisMonthEntriesEl = document.getElementById("thisMonthEntries");

    if (!topProblemEl || !mostActiveCellEl || !thisMonthEntriesEl) return;

    // --- Top Problem ---
    const problemCounts = {};
    allData.forEach(r => {
      const category = String(r[5] || "").trim();
      if (category) {
        problemCounts[category] = (problemCounts[category] || 0) + 1;
      }
    });

    let topProblem = "-";
    let topProblemCount = 0;

    Object.keys(problemCounts).forEach(problem => {
      if (problemCounts[problem] > topProblemCount) {
        topProblemCount = problemCounts[problem];
        topProblem = problem;
      }
    });

    // --- Most Active Cell ---
    const cellCounts = {};
    allData.forEach(r => {
      const cell = String(r[4] || "").trim();
      if (cell) {
        cellCounts[cell] = (cellCounts[cell] || 0) + 1;
      }
    });

    let mostActiveCell = "-";
    let mostActiveCellCount = 0;

    Object.keys(cellCounts).forEach(cell => {
      if (cellCounts[cell] > mostActiveCellCount) {
        mostActiveCellCount = cellCounts[cell];
        mostActiveCell = cell;
      }
    });

    // --- This Month Entries ---
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let thisMonthEntries = 0;

    allData.forEach(r => {
      if (!r[2]) return;

      const d = new Date(r[2]);
      if (isNaN(d)) return;

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        thisMonthEntries++;
      }
    });

    topProblemEl.innerText = topProblem;
    mostActiveCellEl.innerText = mostActiveCell;
    animateCounter("thisMonthEntries", thisMonthEntries);
  }

  function filterData() {
    const text = searchBox.value.toLowerCase().trim();
    const status = statusFilter.value;
    const from = fromDate.value;
    const to = toDate.value;

    filteredData = allData.filter(r => {
      const receiveVal = r[2] ? formatForInput(r[2]) : "";
      const cellVal = String(r[4] || "").toLowerCase();
      const categoryVal = String(r[5] || "").toLowerCase();
      const probVal = String(r[6] || "").toLowerCase();
      const solVal = String(r[7] || "").toLowerCase();
      const remarksVal = String(r[8] || "").toLowerCase();
      const serialVal = String(r[9] || "").toLowerCase();
      const statusVal = r[10] || "Pending";

      const matchesText =
        cellVal.includes(text) ||
        categoryVal.includes(text) ||
        probVal.includes(text) ||
        solVal.includes(text) ||
        remarksVal.includes(text) ||
        serialVal.includes(text);

      const matchesStatus = (status === "ALL" || statusVal === status);

      let matchesDate = true;
      if (from && receiveVal < from) matchesDate = false;
      if (to && receiveVal > to) matchesDate = false;

      return matchesText && matchesStatus && matchesDate;
    });

    currentPage = 1;
    renderTable();
  }

  function renderTable() {
    tbody.innerHTML = "";

    if (filteredData.length === 0) {
      noDataMessage.classList.remove("hidden");
    } else {
      noDataMessage.classList.add("hidden");
    }

    const start = (currentPage - 1) * recordsPerPage;
    const end = start + recordsPerPage;
    const pageData = filteredData.slice(start, end);

    pageData.forEach((r, i) => {
      const displayReceive = r[2] ? formatDate(r[2]) : "";
      const displayHandover = r[3] ? formatDate(r[3]) : "";

      const tr = document.createElement("tr");
      tr.setAttribute("data-id", r[0]);
      tr.innerHTML = `
        <td>${start + i + 1}</td>
        <td>${displayReceive}</td>
        <td>${displayHandover}</td>
        <td>${r[4] || ""}</td>
        <td>${r[5] || ""}</td>
        <td>${r[6] || ""}</td>
        <td>${r[7] || ""}</td>
        <td>${r[8] || ""}</td>
        <td>${r[9] || ""}</td>
        <td>
          <button class="status-btn ${r[10] === 'Pending' ? 'pending' : 'completed'}"
                  onclick="toggleStatus(this)">
            ${r[10] || "Pending"}
          </button>
        </td>
        <td class="admin-only">
          <button onclick="editRow(this)">Edit</button>
          <button onclick="deleteRow(this)">Delete</button>
        </td>`;
      tbody.appendChild(tr);
    });

    const totalPages = Math.ceil(filteredData.length / recordsPerPage) || 1;
    document.getElementById("pageInfo").innerText = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = (currentPage === 1);
    nextBtn.disabled = (currentPage >= totalPages);

    if (role === "user") {
      document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
    }
  }

  function validateForm() {
    if (!receiveInput.value) {
      showToast("Received Date is required", "warning");
      receiveInput.focus();
      return false;
    }

    if (!cellInput.value.trim()) {
      showToast("Cell / Section is required", "warning");
      cellInput.focus();
      return false;
    }

    if (!problemCategoryInput.value.trim()) {
      showToast("Problem Category is required", "warning");
      problemCategoryInput.focus();
      return false;
    }

    if (!problemInput.value.trim()) {
      showToast("Problem Description is required", "warning");
      problemInput.focus();
      return false;
    }

    if (!serialInput.value.trim()) {
      showToast("Laptop Serial Number is required", "warning");
      serialInput.focus();
      return false;
    }

    if (handoverInput.value && receiveInput.value && handoverInput.value < receiveInput.value) {
      showToast("Handover Date cannot be earlier than Received Date", "warning");
      handoverInput.focus();
      return false;
    }

    return true;
  }

  function save() {
    if (!validateForm()) return;

    showLoader(true);

    const fd = new FormData();
    fd.append("action", editId ? "update" : "create");
    fd.append("id", editId || "");
    fd.append("receive", receiveInput.value);
    fd.append("handover", handoverInput.value);
    fd.append("cell", cellInput.value.trim());
    fd.append("problemCategory", problemCategoryInput.value.trim());
    fd.append("problem", problemInput.value.trim());
    fd.append("solution", solutionInput.value.trim());
    fd.append("remarks", remarksInput.value.trim());
    fd.append("serial", serialInput.value.trim());

    fetch(scriptURL, { method: "POST", body: fd })
      .then(() => {
        showToast(editId ? "Entry updated successfully" : "Entry saved successfully", "success");
        showSuccessModal();
        resetForm();
        load();
      })
      .catch(() => {
        showToast("Failed to save entry", "error");
      })
      .finally(() => {
        showLoader(false);
      });
  }

  function resetForm() {
    editId = null;
    form.reset();
    formModeText.innerText = "Enter / Update Maintenance Details";
  }

  function clearFilters() {
    searchBox.value = "";
    statusFilter.value = "ALL";
    fromDate.value = "";
    toDate.value = "";
    filterData();
    showToast("Filters cleared", "success");
  }

  function getAnalyticsFilteredData() {
  const selectedYear = analyticsYearFilter.value;
  const selectedMonth = analyticsMonthFilter.value;

  return allData.filter(r => {
    if (!r[2]) return false;

    const d = new Date(r[2]);
    if (isNaN(d)) return false;

    const yearMatch =
      selectedYear === "ALL" || String(d.getFullYear()) === selectedYear;

    const monthMatch =
      selectedMonth === "ALL" || String(d.getMonth()) === selectedMonth;

    return yearMatch && monthMatch;
  });
}

  function populateAnalyticsYearFilter() {
  const years = [...new Set(
    allData
      .map(r => {
        if (!r[2]) return null;
        const d = new Date(r[2]);
        return isNaN(d) ? null : d.getFullYear();
      })
      .filter(Boolean)
  )].sort((a, b) => b - a);

  const currentValue = analyticsYearFilter.value || "ALL";

  analyticsYearFilter.innerHTML = `<option value="ALL">All Years</option>`;

  years.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    analyticsYearFilter.appendChild(option);
  });

  analyticsYearFilter.value = years.includes(Number(currentValue)) ? currentValue : "ALL";
}

  // ===== ANALYTICS =====
  function updateAnalyticsCharts() {
    updateNewProcurementKPI();
    createCompletionChart();
    createCellChart();
    createProblemChart();
    createCellNewProcurementChart();
    createMonthNewProcurementChart();
    createMonthEntriesChart();
  }

  function updateNewProcurementKPI() {
    const data = getAnalyticsFilteredData();
    const count = data.filter(r => (r[5] || "").trim().toLowerCase() === "new procurement").length;
    animateCounter("newProcurementCount", count);
  }

  function createCompletionChart() {
    const data = getAnalyticsFilteredData();

    const pending = data.filter(r => (r[10] || "Pending") === "Pending").length;
    const completed = data.filter(r => r[10] === "Completed").length;

    const ctx = document.getElementById("completionChart").getContext("2d");

    if (completionChart) completionChart.destroy();

    completionChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Completed"],
        datasets: [{
          data: [pending, completed],
          backgroundColor: ["#ffb703", "#06d6a0"],
          borderColor: "#ffffff",
          borderWidth: 4,
          hoverOffset: 16
        }]
      },
      options: getChartOptions()
    });
  }

  function createCellChart() {
    const data = getAnalyticsFilteredData();
    const cellCounts = {};

    data.forEach(r => {
      const cell = (r[4] || "Unknown").trim();
      cellCounts[cell] = (cellCounts[cell] || 0) + 1;
    });

    const labels = Object.keys(cellCounts);
    const values = Object.values(cellCounts);

    const ctx = document.getElementById("cellChart").getContext("2d");

    if (cellChart) cellChart.destroy();

    cellChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: generateColors(labels.length),
          borderColor: "#ffffff",
          borderWidth: 4,
          hoverOffset: 16
        }]
      },
      options: getChartOptions()
    });
  }

  function createProblemChart() {
    const data = getAnalyticsFilteredData();
    const problemCounts = {};

    data.forEach(r => {
      const category = (r[5] || "Unknown").trim();
      problemCounts[category] = (problemCounts[category] || 0) + 1;
    });

    const labels = Object.keys(problemCounts);
    const values = Object.values(problemCounts);

    const ctx = document.getElementById("problemChart").getContext("2d");

    if (problemChart) problemChart.destroy();

    problemChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: generateColors(labels.length),
          borderColor: "#ffffff",
          borderWidth: 4,
          hoverOffset: 16
        }]
      },
      options: getChartOptions()
    });
  }

  function createCellNewProcurementChart() {
    const data = getAnalyticsFilteredData();
    const counts = {};

    data.forEach(r => {
      if ((r[5] || "").trim().toLowerCase() === "new procurement") {
        const cell = (r[4] || "Unknown").trim();
        counts[cell] = (counts[cell] || 0) + 1;
      }
    });

    const labels = Object.keys(counts);
    const values = Object.values(counts);

    const ctx = document.getElementById("cellNewProcurementChart").getContext("2d");

    if (cellNewProcurementChart) cellNewProcurementChart.destroy();

    cellNewProcurementChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: generateColors(labels.length),
          borderColor: "#ffffff",
          borderWidth: 4,
          hoverOffset: 16
        }]
      },
      options: getChartOptions()
    });
  }

  function createMonthNewProcurementChart() {
    const data = getAnalyticsFilteredData();
    const counts = {};

    data.forEach(r => {
      if ((r[5] || "").trim().toLowerCase() === "new procurement" && r[2]) {
        const d = new Date(r[2]);
        if (isNaN(d)) return;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const sortedKeys = Object.keys(counts).sort();
    const labels = sortedKeys.map(key => {
      const [year, month] = key.split("-");
      const d = new Date(year, Number(month) - 1, 1);
      return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
    });
    const values = sortedKeys.map(key => counts[key]);

    const ctx = document.getElementById("monthNewProcurementChart").getContext("2d");

    if (monthNewProcurementChart) monthNewProcurementChart.destroy();

    monthNewProcurementChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "New Procurement",
          data: values,
          backgroundColor: "#06b6d4",
          borderRadius: 10,
          borderSkipped: false,
          hoverBackgroundColor: "#0891b2"
        }]
      },
      options: getBarChartOptions("New Procurement")
    });
  }

  function createMonthEntriesChart() {
    const data = getAnalyticsFilteredData();
    const counts = {};

    data.forEach(r => {
      if (r[2]) {
        const d = new Date(r[2]);
        if (isNaN(d)) return;

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });

    const sortedKeys = Object.keys(counts).sort();
    const labels = sortedKeys.map(key => {
      const [year, month] = key.split("-");
      const d = new Date(year, Number(month) - 1, 1);
      return d.toLocaleString("en-GB", { month: "short", year: "numeric" });
    });
    const values = sortedKeys.map(key => counts[key]);

    const ctx = document.getElementById("monthEntriesChart").getContext("2d");

    if (monthEntriesChart) monthEntriesChart.destroy();

    monthEntriesChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Entries Made",
          data: values,
          backgroundColor: "#8b5cf6",
          borderRadius: 10,
          borderSkipped: false,
          hoverBackgroundColor: "#7c3aed"
        }]
      },
      options: getBarChartOptions("Entries Made")
    });
  }

  function getChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200
      },
      interaction: {
        mode: "nearest",
        intersect: true
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
            font: {
              size: 12,
              weight: "600"
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const value = context.raw;
              const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
              return ` ${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };
  }

  function getBarChartOptions(labelText = "Count") {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleColor: "#fff",
          bodyColor: "#fff",
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `${labelText}: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 30,
            font: {
              size: 11,
              weight: "600"
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: {
              size: 11,
              weight: "600"
            }
          },
          grid: {
            color: "rgba(148, 163, 184, 0.15)"
          }
        }
      }
    };
  }

  function generateColors(count) {
    const colors = [
      "#4361ee", "#3a86ff", "#06d6a0", "#f72585", "#ff9f1c",
      "#8338ec", "#2ec4b6", "#e76f51", "#118ab2", "#ef476f",
      "#ffd166", "#8ecae6", "#219ebc", "#ff006e", "#6a4c93",
      "#fb8500", "#90be6d", "#577590", "#b5179e", "#00b4d8"
    ];

    let result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  }

  // ===== TABLE ACTIONS =====
  window.editRow = btn => {
    if (role !== "admin") return;

    const id = btn.closest("tr").dataset.id;
    const record = allData.find(r => String(r[0]) === String(id));

    if (record) {
      editId = id;
      receiveInput.value = formatForInput(record[2]);
      handoverInput.value = formatForInput(record[3]);
      cellInput.value = record[4] || "";
      problemCategoryInput.value = record[5] || "";
      problemInput.value = record[6] || "";
      solutionInput.value = record[7] || "";
      remarksInput.value = record[8] || "";
      serialInput.value = record[9] || "";
      formModeText.innerText = "Editing Existing Entry";
      window.scrollTo({ top: 0, behavior: "smooth" });
      showToast("Edit mode enabled", "warning");
    }
  };

  window.deleteRow = btn => {
    if (role !== "admin") return;
    if (!confirm("Delete entry?")) return;

    showLoader(true);

    const fd = new FormData();
    fd.append("action", "delete");
    fd.append("id", btn.closest("tr").dataset.id);

    fetch(scriptURL, { method: "POST", body: fd })
      .then(() => {
        showToast("Entry deleted successfully", "success");
        load();
      })
      .catch(() => {
        showToast("Failed to delete entry", "error");
      })
      .finally(() => {
        showLoader(false);
      });
  };

  window.toggleStatus = btn => {
    if (role !== "admin") return;

    showLoader(true);

    const fd = new FormData();
    fd.append("action", "status");
    fd.append("id", btn.closest("tr").dataset.id);
    fd.append("status", btn.innerText.trim() === "Pending" ? "Completed" : "Pending");

    fetch(scriptURL, { method: "POST", body: fd })
      .then(() => {
        showToast("Status updated successfully", "success");
        load();
      })
      .catch(() => {
        showToast("Failed to update status", "error");
      })
      .finally(() => {
        showLoader(false);
      });
  };

  setInterval(() => {
    clock.innerText = new Date().toLocaleString("en-GB");
  }, 1000);

  load();
});

// --- Helper Functions ---
function formatDate(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  return isNaN(d) ? dateValue : d.toLocaleDateString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function formatForInput(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (isNaN(d)) return "";
  return d.toISOString().split("T")[0];
}

function animateCounter(id, target) {
  let el = document.getElementById(id);
  if (!el) return;

  let count = 0;
  let step = Math.ceil(target / 30) || 1;

  let interval = setInterval(() => {
    count += step;
    if (count >= target) {
      count = target;
      clearInterval(interval);
    }
    el.innerText = count;
  }, 30);
}

function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showLoader(show) {
  const loader = document.getElementById("loader");
  loader.classList.toggle("hidden", !show);
}

function showSuccessModal() {
  document.getElementById("successModal").classList.remove("hidden");
}

function closeSuccessModal() {
  document.getElementById("successModal").classList.add("hidden");
}

function exportExcel() {
  const table = document.getElementById("dataTable").cloneNode(true);

  Array.from(table.rows).forEach(row => {
    row.deleteCell(-1);
  });

  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, "Maintenance_Report.xlsx");
}

function exportPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("l", "mm", "a3");

  const total = filteredData.length;
  const pending = filteredData.filter(r => r[10] === "Pending").length;
  const completed = filteredData.filter(r => r[10] === "Completed").length;

  pdf.setFontSize(16);
  pdf.setFont(undefined, "bold");
  pdf.text("IT Equipment Maintenance Report", 35, 12);

  pdf.setFontSize(9);
  pdf.setFont(undefined, "normal");
  pdf.text("Generated: " + new Date().toLocaleString(), 35, 18);

  pdf.setFontSize(11);
  pdf.setFont(undefined, "bold");
  pdf.text("Summary:", 14, 30);

  pdf.setFont(undefined, "normal");
  pdf.text(`Total: ${total}`, 14, 36);
  pdf.text(`Pending: ${pending}`, 50, 36);
  pdf.text(`Completed: ${completed}`, 90, 36);

  const headers = [[
    "SL", "Receive", "Handover", "Cell", "Category", "Problem", "Solution", "Remarks", "Serial", "Status"
  ]];

  const body = filteredData.map((r, i) => [
    i + 1,
    r[2] ? formatDate(r[2]) : "",
    r[3] ? formatDate(r[3]) : "",
    r[4] || "",
    r[5] || "",
    r[6] || "",
    r[7] || "",
    r[8] || "",
    r[9] || "",
    r[10] || "Pending"
  ]);

  pdf.autoTable({
    head: headers,
    body: body,
    startY: 42,
    styles: {
      fontSize: 7,
      cellPadding: 3,
      overflow: "linebreak",
      valign: "top"
    },
    headStyles: {
      fillColor: [0, 102, 204],
      textColor: 255,
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 26 },
      4: { cellWidth: 28 },
      5: { cellWidth: 55 },
      6: { cellWidth: 55 },
      7: { cellWidth: 38 },
      8: { cellWidth: 28 },
      9: { cellWidth: 20 }
    }
  });

  pdf.save("Maintenance_Report.pdf");
}

// =========================
// BULK UPLOAD ELEMENTS
// =========================
const openBulkUploadBtn = document.getElementById("openBulkUploadBtn");
const bulkUploadModal = document.getElementById("bulkUploadModal");
const closeBulkUploadBtn = document.getElementById("closeBulkUploadBtn");
const clearBulkFormBtn = document.getElementById("clearBulkFormBtn");

const bulkUploadBtn = document.getElementById("bulkUploadBtn");
const bulkFile = document.getElementById("bulkFile");
const bulkReceiveDate = document.getElementById("bulkReceiveDate");
const bulkCell = document.getElementById("bulkCell");
const bulkRemarks = document.getElementById("bulkRemarks");

const bulkSuccessModal = document.getElementById("bulkSuccessModal");
const bulkSuccessMessage = document.getElementById("bulkSuccessMessage");
const closeBulkSuccessBtn = document.getElementById("closeBulkSuccessBtn");

// =========================
// BULK MODAL OPEN/CLOSE
// =========================
if (openBulkUploadBtn) {
  openBulkUploadBtn.addEventListener("click", () => {
    bulkUploadModal.classList.remove("hidden");
  });
}

if (closeBulkUploadBtn) {
  closeBulkUploadBtn.addEventListener("click", () => {
    bulkUploadModal.classList.add("hidden");
  });
}

if (closeBulkSuccessBtn) {
  closeBulkSuccessBtn.addEventListener("click", () => {
    bulkSuccessModal.classList.add("hidden");
  });
}

if (bulkUploadModal) {
  bulkUploadModal.addEventListener("click", (e) => {
    if (e.target === bulkUploadModal) {
      bulkUploadModal.classList.add("hidden");
    }
  });
}

// =========================
// RESET BULK FORM
// =========================
function resetBulkForm() {
  if (bulkReceiveDate) bulkReceiveDate.value = "";
  if (bulkCell) bulkCell.value = "";
  if (bulkRemarks) bulkRemarks.value = "";
  if (bulkFile) bulkFile.value = "";
}

if (clearBulkFormBtn) {
  clearBulkFormBtn.addEventListener("click", resetBulkForm);
}

// =========================
// BULK PROCUREMENT UPLOAD
// =========================
if (bulkUploadBtn) {
  bulkUploadBtn.addEventListener("click", async () => {
    const file = bulkFile.files[0];
    const receive = bulkReceiveDate.value;
    const cell = bulkCell.value.trim();
    const remarks = bulkRemarks.value.trim();

    if (!receive || !cell || !file) {
      showToast("Please fill Receive Date, Cell and choose a file", "warning");
      return;
    }

    showLoader(true);

    try {
      const serials = await extractSerialsFromFile(file);

      if (!serials.length) {
        showLoader(false);
        showToast("No valid serial numbers found in file", "error");
        return;
      }

      const fd = new FormData();
      fd.append("action", "bulkUpload");
      fd.append("receive", receive);
      fd.append("cell", cell);
      fd.append("remarks", remarks);
      fd.append("serials", serials.join("||"));

      const res = await fetch(scriptURL, {
        method: "POST",
        body: fd
      });

      const result = await res.json();
      showLoader(false);

      if (result.status === "success") {
        showToast(`${result.count} serial numbers uploaded successfully`, "success");

        resetBulkForm();
        bulkUploadModal.classList.add("hidden");

        bulkSuccessMessage.textContent = `${result.count} serial numbers uploaded successfully.`;
        bulkSuccessModal.classList.remove("hidden");

        location.reload();
      } else {
        showToast(result.message || "Bulk upload failed", "error");
      }

    } catch (err) {
      showLoader(false);
      console.error(err);
      showToast("Error reading file or uploading data", "error");
    }
  });
}

// =========================
// EXTRACT SERIALS FROM FILE
// =========================
function extractSerialsFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (!json || !json.length) {
          resolve([]);
          return;
        }

        const serials = json
          .flat()
          .map(v => String(v || "").trim())
          .filter(v =>
            v &&
            v.toLowerCase() !== "serial number" &&
            v.toLowerCase() !== "serial" &&
            v.toLowerCase() !== "nan"
          );

        const uniqueSerials = [...new Set(serials)];

        resolve(uniqueSerials);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
function downloadSample() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Serial Number"],
    ["SN12345"],
    ["SN67890"],
    ["SN54321"]
  ]);

  XLSX.utils.book_append_sheet(wb, ws, "Sample");
  XLSX.writeFile(wb, "Bulk_Upload_Sample.xlsx");
}
function logout() {
  if (!confirm("Are you sure you want to logout?")) return;
  localStorage.clear();
  window.location.href = "index.html";
}