// =============================
// 데이터
// =============================
let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];

let editMaterialCode = null;
let selectedHistoryCode = null;

// =============================
// 공통
// =============================
function saveAll() {
  localStorage.setItem("materials", JSON.stringify(materials));
  localStorage.setItem("quotes", JSON.stringify(quotes));
  localStorage.setItem("products", JSON.stringify(products));
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("ko-KR");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsString(str) {
  return String(str ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

// =============================
// 페이지 전환
// =============================
function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => {
    p.style.display = "none";
  });

  const target = document.getElementById(id);
  if (target) target.style.display = "block";

  if (id === "db") {
    loadMaterials();
    loadPriceHistory(document.getElementById("priceSearch")?.value || "");
  }

  if (id === "recipe") {
    loadProducts();
    refreshRecipeMaterialOptions();
    refreshRecipePrices();
    updateRatioTotal();
    updateUnitCost();
  }

  if (id === "calc") {
    loadCalcProducts();
  }

  if (id === "history") {
    loadQuotes();
  }
}

// =============================
// 날짜 처리
// =============================
function normalizeDate(dateValue) {
  if (dateValue === null || dateValue === undefined || dateValue === "") return "";

  if (typeof dateValue === "number" || (!isNaN(dateValue) && String(dateValue).trim() !== "")) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + Number(dateValue) * 86400000);

    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  const text = String(dateValue).trim();
  const d = new Date(text);

  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// =============================
// 원재료 공통
// =============================
function getLatestRecordByCode(code) {
  const rows = materials.filter((m) => String(m.code) === String(code));
  if (rows.length === 0) return null;

  rows.sort((a, b) => {
    const ad = new Date(normalizeDate(a.date) || "1900-01-01").getTime();
    const bd = new Date(normalizeDate(b.date) || "1900-01-01").getTime();
    return bd - ad;
  });

  return rows[0];
}

function getAllLatestMaterials() {
  const codeMap = {};

  materials.forEach((row) => {
    const key = String(row.code);
    const latest = codeMap[key];

    if (!latest) {
      codeMap[key] = row;
      return;
    }

    const latestTime = new Date(normalizeDate(latest.date) || "1900-01-01").getTime();
    const rowTime = new Date(normalizeDate(row.date) || "1900-01-01").getTime();

    if (rowTime > latestTime) {
      codeMap[key] = row;
    }
  });

  return Object.values(codeMap).sort((a, b) =>
    String(a.code).localeCompare(String(b.code))
  );
}

function getLatestPriceByCode(code) {
  const latest = getLatestRecordByCode(code);
  return latest ? Number(latest.price || 0) : 0;
}

function getLatestNameByCode(code) {
  const latest = getLatestRecordByCode(code);
  return latest ? latest.name : "";
}

// =============================
// 입력 초기화
// =============================
function clearMaterialInputs() {
  document.getElementById("materialCode").value = "";
  document.getElementById("materialName").value = "";
  document.getElementById("materialPrice").value = "";
  document.getElementById("materialDate").value = "";

  editMaterialCode = null;
}

// =============================
// 원가 계산 공통
// =============================
function calculateMaterialCost(recipe) {
  let total = 0;

  recipe.forEach((item) => {
    const price = getLatestPriceByCode(item.materialCode);
    const ratio = Number(item.ratio || 0);
    total += price * (ratio / 100);
  });

  return Math.round(total);
}

function calculateUnitCostByProduct(materialCost, volume, unit, density) {
  const cost = Number(materialCost || 0);
  const qty = Number(volume || 0);
  const specGravity = Number(density || 1);

  if (qty <= 0) return 0;

  let weightKg = 0;

  if (unit === "g") weightKg = qty / 1000;
  else if (unit === "ml") weightKg = (qty * specGravity) / 1000;

  return Math.round(cost * weightKg);
}
// =============================
// 원재료 저장 / 수정 / 삭제
// =============================
function saveMaterial() {
  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const price = Number(document.getElementById("materialPrice").value);
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (!code || !name || !price || !date) {
    alert("모든 항목 입력");
    return;
  }

  materials.push({
    id: Date.now() + Math.random(),
    code,
    name,
    price,
    date
  });

  saveAll();
  selectedHistoryCode = code;

  loadMaterials();
  loadPriceHistory(code);
}

function editMaterial(code) {
  const latest = getLatestRecordByCode(code);
  if (!latest) return;

  editMaterialCode = code;
  selectedHistoryCode = code;

  document.getElementById("materialCode").value = latest.code;
  document.getElementById("materialName").value = latest.name;
  document.getElementById("materialPrice").value = latest.price;
  document.getElementById("materialDate").value = normalizeDate(latest.date);

  loadPriceHistory(code);
}

function deleteMaterial(code) {
  const ok = confirm("전체 이력 삭제?");
  if (!ok) return;

  materials = materials.filter((m) => String(m.code) !== String(code));

  saveAll();
  loadMaterials();
  loadPriceHistory("");
}

// =============================
// 원재료 목록
// =============================
function loadMaterials() {
  const list = document.getElementById("materialList");
  const keyword = document.getElementById("materialSearch").value.toLowerCase();

  list.innerHTML = "";

  const data = getAllLatestMaterials().filter(
    (m) =>
      m.name.toLowerCase().includes(keyword) ||
      String(m.code).toLowerCase().includes(keyword)
  );

  if (!data.length) {
    list.innerHTML = `<tr><td colspan="7">없음</td></tr>`;
    return;
  }

  data.forEach((m, i) => {
    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${m.code}</td>
        <td>${m.name}</td>
        <td>${formatNumber(m.price)} 원</td>
        <td>${m.date}</td>
        <td><button onclick="editMaterial('${m.code}')">수정</button></td>
        <td><button class="danger" onclick="deleteMaterial('${m.code}')">삭제</button></td>
      </tr>
    `;
  });
}

// =============================
// 🔥 가격 히스토리 (삭제 포함)
// =============================
function loadPriceHistory(keyword) {
  const table = document.getElementById("priceHistoryTable");
  table.innerHTML = "";

  let list = [...materials];

  if (keyword) {
    list = list.filter(
      (m) =>
        String(m.name).includes(keyword) ||
        String(m.code).includes(keyword)
    );
  }

  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    table.innerHTML = `<tr><td colspan="5">없음</td></tr>`;
    return;
  }

  list.forEach((m) => {
    table.innerHTML += `
      <tr>
        <td>${m.code}</td>
        <td>${m.name}</td>
        <td>${formatNumber(m.price)} 원</td>
        <td>${m.date}</td>
        <td><button class="danger" onclick="deletePriceHistory('${m.id}')">삭제</button></td>
      </tr>
    `;
  });
}

function deletePriceHistory(id) {
  const ok = confirm("이 이력 삭제?");
  if (!ok) return;

  materials = materials.filter((m) => String(m.id) !== String(id));

  saveAll();
  loadMaterials();
  loadPriceHistory("");
}

function searchPriceHistory() {
  loadPriceHistory(document.getElementById("priceSearch").value);
}

// =============================
// 초기 실행
// =============================
loadMaterials();
loadProducts();
loadQuotes();
loadPriceHistory("");
loadCalcProducts();
refreshRecipeMaterialOptions();
refreshRecipePrices();
updateRatioTotal();
