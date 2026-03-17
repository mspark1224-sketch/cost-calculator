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
// 최신 원재료
// =============================
function getAllLatestMaterials() {
  const map = {};

  materials.forEach((m) => {
    const key = String(m.code);

    if (!map[key]) {
      map[key] = m;
    } else {
      const prev = new Date(map[key].date);
      const curr = new Date(m.date);

      if (curr > prev) {
        map[key] = m;
      }
    }
  });

  return Object.values(map);
}

function getLatestPriceByCode(code) {
  const list = materials.filter((m) => String(m.code) === String(code));
  if (!list.length) return 0;

  return list.sort((a, b) => new Date(b.date) - new Date(a.date))[0].price;
}

// =============================
// 입력 초기화
// =============================
function clearMaterialInputs() {
  document.getElementById("materialCode").value = "";
  document.getElementById("materialName").value = "";
  document.getElementById("materialPrice").value = "";
  document.getElementById("materialDate").value = "";
}

// =============================
// 원재료 저장 (🔥완성)
// =============================
function saveMaterial() {
  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const priceValue = document.getElementById("materialPrice").value;
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (!code || !name || priceValue === "" || !date) {
    alert("모든 값을 입력하세요");
    return;
  }

  const price = Number(priceValue);

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
        <td>${formatNumber(m.price)} 원</td>
        <td>${m.date}</td>
        <td><button onclick="editMaterial('${m.code}')">수정</button></td>
        <td><button onclick="deleteMaterial('${m.code}')">삭제</button></td>
      </tr>
    `;
  });
}

// =============================
// 엑셀 업로드
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
      if (!row["코드"] || !row["원재료명"]) return;

      materials.push({
        id: Date.now() + Math.random(),
        code: row["코드"],
        name: row["원재료명"],
        price: Number(row["단가"] || 0),
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
    const price = getLatestPriceByCode(r.materialCode);
    total += price * (r.ratio / 100);
  });

  return Math.round(total);
}

function updateUnitCost() {
  const recipe = getRecipeData();
  const total = calculateMaterialCost(recipe);

  const volume = Number(document.getElementById("productVolume").value || 0);
  const density = Number(document.getElementById("productDensity").value || 1);
  const unit = document.getElementById("productUnit").value;

  let weight = unit === "g"
    ? volume / 1000
    : (volume * density) / 1000;

  document.getElementById("recipeUnitCost").value =
    Math.round(total * weight);
}

// =============================
// 제품 저장
// =============================
function saveRecipe() {
  const name = document.getElementById("productName").value.trim();

  if (!name) {
    alert("제품명 입력");
    return;
  }

  const recipe = getRecipeData();

  if (!recipe.length) {
    alert("배합 추가하세요");
    return;
  }

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
        <td>${formatNumber(p.materialCost)} 원</td>
      </tr>
    `;
  });
}

// =============================
// 원가 계산
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
  const id = document.getElementById("calcProductSelect").value;

  const product = products.find((p) => String(p.id) === String(id));

  if (!product) {
    alert("제품 선택");
    return;
  }

  const mfg = Number(document.getElementById("mfgInput").value || 0);
  const pack = Number(document.getElementById("packInput").value || 0);
  const logi = Number(document.getElementById("logiInput").value || 0);
  const margin = Number(document.getElementById("marginInput").value || 0) / 100;

  const total = product.materialCost + mfg + pack + logi;
  const quote = Math.round(total * (1 + margin));

  document.getElementById("result").innerText =
    formatNumber(quote) + " 원";
}
