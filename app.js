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
  if (!dateValue) return "";

  if (!isNaN(dateValue)) {
    const base = new Date(1899, 11, 30);
    const d = new Date(base.getTime() + Number(dateValue) * 86400000);
    return d.toISOString().slice(0, 10);
  }

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// =============================
// 원재료 공통
// =============================
function getLatestRecordByCode(code) {
  const rows = materials.filter((m) => String(m.code) === String(code));
  if (!rows.length) return null;

  return rows.sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  )[0];
}

function getLatestPriceByCode(code) {
  return getLatestRecordByCode(code)?.price || 0;
}

// =============================
// 원재료 저장
// =============================
function saveMaterial() {
  const code = materialCode.value.trim();
  const name = materialName.value.trim();
  const price = Number(materialPrice.value);
  const date = normalizeDate(materialDate.value);

  if (!code || !name || !price || !date) {
    alert("모든 값을 입력하세요");
    return;
  }

  materials.push({
    id: Date.now(),
    code,
    name,
    price,
    date
  });

  saveAll();
  loadMaterials();
  clearMaterialInputs();
}

// =============================
// 원재료 리스트
// =============================
function loadMaterials() {
  const list = document.getElementById("materialList");
  if (!list) return;

  list.innerHTML = "";

  getAllLatestMaterials().forEach((m, i) => {
    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${m.code}</td>
        <td>${m.name}</td>
        <td>${formatNumber(m.price)}</td>
        <td>${m.date}</td>
        <td><button onclick="editMaterial('${m.code}')">수정</button></td>
        <td><button onclick="deleteMaterial('${m.code}')">삭제</button></td>
      </tr>
    `;
  });
}

// =============================
// 엑셀 업로드 (최종 완성)
// =============================
function handleExcelUpload() {
  const file = document.getElementById("excelFile").files[0];

  if (!file) {
    alert("파일 선택");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const workbook = XLSX.read(e.target.result, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach((row) => {
      materials.push({
        id: Date.now(),
        code: row["코드"],
        name: row["원재료명"],
        price: Number(row["단가"]),
        date: normalizeDate(row["적용일"])
      });
    });

    saveAll();
    loadMaterials();
    alert("업로드 완료");
  };

  reader.readAsArrayBuffer(file);
}
// =============================
// 배합표
// =============================
function calculateMaterialCost(recipe) {
  let total = 0;
  recipe.forEach((r) => {
    total += getLatestPriceByCode(r.materialCode) * (r.ratio / 100);
  });
  return Math.round(total);
}

function updateUnitCost() {
  const recipe = getRecipeData();
  const total = calculateMaterialCost(recipe);

  const volume = Number(productVolume.value);
  const density = Number(productDensity.value);
  const unit = productUnit.value;

  let weight = unit === "g" ? volume / 1000 : (volume * density) / 1000;

  recipeUnitCost.value = Math.round(total * weight);
}

// =============================
// 제품 저장
// =============================
function saveRecipe() {
  const name = productName.value.trim();

  const recipe = getRecipeData();

  const materialCost = calculateMaterialCost(recipe);

  products.push({
    id: Date.now(),
    name,
    recipe,
    materialCost
  });

  saveAll();
  loadProducts();
  alert("저장 완료");
}

// =============================
// 제품 목록
// =============================
function loadProducts() {
  const list = document.getElementById("productList");
  if (!list) return;

  list.innerHTML = "";

  products.forEach((p) => {
    list.innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${formatNumber(p.materialCost)}</td>
      </tr>
    `;
  });
}

// =============================
// 원가 계산 페이지
// =============================
function loadCalcProducts() {
  const select = document.getElementById("calcProductSelect");

  select.innerHTML = '<option value="">제품 선택</option>';

  products.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    select.appendChild(option);
  });
}

function calculate() {
  const id = calcProductSelect.value;
  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    alert("제품 선택");
    return;
  }

  const mfg = Number(mfgInput.value || 0);
  const pack = Number(packInput.value || 0);
  const logi = Number(logiInput.value || 0);
  const margin = Number(marginInput.value || 0) / 100;

  const total = product.materialCost + mfg + pack + logi;
  const quote = Math.round(total * (1 + margin));

  result.innerText = formatNumber(quote) + " 원";
}
