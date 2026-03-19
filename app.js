// =============================
// 데이터
// =============================
let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];
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
window.showPage = function(id) {
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
  if (typeof window.loadProducts === "function") {
    window.loadProducts();
  }
}

  if (id === "calc") {
    loadCalcProducts();
  }

  if (id === "history") {
    loadQuotes();
  }
}
// =============================
// 제품 목록 불러오기
// =============================
function loadProducts() {
  const tbody = document.getElementById("productList");
  if (!tbody) return;

  tbody.innerHTML = "";

  products.forEach((p) => {
    const tr = document.createElement("tr");
const liveCost = calculateLiveCost(p);
const diff = liveCost - p.costPerKg;
tr.style = diff !== 0
  ? `background:${diff > 0 ? '#fff1f2' : '#eff6ff'};`
  : "";
    // 🔥 추가 단위원가도 변경
let liveUnitCost = 0;
if (p.volume) {
  let volumeKg = 0;

  if (p.unit === "g") {
    volumeKg = p.volume / 1000;
  } else if (p.unit === "ml") {
    volumeKg = (p.volume * (p.density || 1)) / 1000;
  }

  liveUnitCost = liveCost * volumeKg;
}
    tr.innerHTML = `
      <td><input type="checkbox" class="rowCheck" value="${p.id}"></td>
      <td>${p.type || "-"}</td>
      <td 
  style="cursor:pointer; color:#2563eb; font-weight:500;"
  onclick="loadProduct(${p.id})"
>
  ${p.name}
</td>
    <td>
  ${formatNumber(liveCost)} 원
  ${
    diff !== 0
      ? `(
          ${formatNumber(p.costPerKg)} + 
          <span style="color:red;">${formatNumber(diff)}</span>
        )`
      : ""
  }
</td>
     <td>
  ${formatNumber(p.unitCost)} 원
  ${Math.round(liveUnitCost) !== Math.round(p.unitCost) ? `<span style="color:red;">→ ${formatNumber(liveUnitCost)}</span>` : ""}
</td>
      <td>${new Date(p.date).toLocaleString("ko-KR")}</td>
    `;

    tbody.appendChild(tr);
  });
}
window.searchPriceHistory = function() {
  const keyword = document.getElementById("priceSearch").value;
  loadPriceHistory(keyword);
}

// =============================
// 날짜 처리
// =============================
function normalizeDate(dateValue) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// =============================
// 원재료 공통
// =============================
function getLatestRecordByCode(code) {
  const cleanCode = String(code).trim();

  const filtered = materials.filter((m) => 
    String(m.code).trim() === cleanCode
  );

  if (filtered.length === 0) return null;

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  return filtered[0];
}
function getAllLatestMaterials() {
  const map = {};

  materials.forEach((m) => {
    const key = String(m.code);

    if (!map[key] || new Date(m.date) > new Date(map[key].date)) {
      map[key] = m;
    }
  });

  return Object.values(map);
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
// 저장
// =============================
function saveMaterial() {
  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const price = Number(document.getElementById("materialPrice").value);
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (!code || !name || date === "") {
    alert("모든 항목 입력");
    return;
  }

  // 🔥 이름 중복 체크 (여기 추가)
  const existsName = materials.some(m =>
    m.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existsName) {
    alert("같은 원재료명이 이미 존재합니다!");
    return;
  }
  // 🔥 코드 중복 체크 (여기!)
  const existsCode = materials.some(m =>
    String(m.code) === String(code)
  );

  if (existsCode) {
    alert("같은 코드가 이미 존재합니다!");
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
  loadPriceHistory("");
}
function handleExcelUpload() {
  const fileInput = document.getElementById("excelFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("엑셀 파일을 선택해주세요.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      alert("엑셀 데이터가 없습니다.");
      return;
    }

 rows.forEach((row) => {
  const code = String(row["코드"] || "").trim();
  const name = String(row["이름"] || "").trim();

  const rawPrice = row["단가"] || "0";

  // 🔥 수정 핵심
  const price = parseFloat(
    String(rawPrice).replace(/[^\d.]/g, "")
  ) || 0;

  const date = new Date().toISOString().slice(0, 10);

  if (!code || !name) return;

  materials.push({
    id: Date.now() + Math.random(),
    code,
    name,
    price,
    date
  });
});

    saveAll();
    loadMaterials();
    loadPriceHistory("");

    fileInput.value = "";
    alert("엑셀 업로드가 완료되었습니다.");
  };

  reader.readAsArrayBuffer(file);
}


// =============================
// 원가 계산
// =============================
window.updateUnitCost = function () {
  const volume = parseFloat(document.getElementById("productVolume")?.value) || 0;
  const density = parseFloat(document.getElementById("productDensity")?.value) || 1;
  const unit = (document.getElementById("productUnit")?.value || "").toLowerCase();

  const costEl = document.getElementById("materialCostSum");
  const costText = costEl ? costEl.textContent.trim() : "0";
  const totalCostPerKg = parseFloat(costText.replace(/[^\d.]/g, "")) || 0;

  let volumeKg = 0;
  if (unit === "g") {
    volumeKg = volume / 1000;
  } else if (unit === "ml") {
    volumeKg = (volume * density) / 1000;
  } else {
    volumeKg = volume / 1000;
  }

  const unitCost = totalCostPerKg * volumeKg;
  document.getElementById("recipeUnitCost").value = unitCost.toFixed(2);
};


window.saveRecipe = function () {
  const name = document.getElementById("productName")?.value.trim();
  const type = document.getElementById("productType")?.value || "일반";

  if (!name) {
    alert("제품명을 입력하세요");
    return;
  }
// 🔥 기존 제품 덮어쓰기 처리 0319 수정
const existingIndex = products.findIndex(p => p.name === name);

if (existingIndex !== -1) {
  if (!confirm("이미 동일한 제품이 있습니다. 덮어쓰시겠습니까?")) {
    return;
  }

  // 기존 데이터 삭제
  products.splice(existingIndex, 1);
}
  const costEl = document.getElementById("materialCostSum");
  const costText = costEl ? costEl.textContent.trim() : "0";
  const costPerKg = parseFloat(costText.replace(/[^\d.]/g, "")) || 0;

  const unitCost = parseFloat(document.getElementById("recipeUnitCost")?.value) || 0;
  const volume = parseFloat(document.getElementById("productVolume")?.value) || 0;
const unit = document.getElementById("productUnit")?.value || "g";
const density = parseFloat(document.getElementById("productDensity")?.value) || 1;

  const recipe = [];
 document.querySelectorAll("#recipeTable tbody tr").forEach(row => {
  const input = row.querySelector("td:nth-child(1) input");
  const code = row.querySelector(".code")?.textContent || "";
  const price = parseFloat(row.querySelector(".price")?.dataset.price) || 0;
  const ratio = parseFloat(row.querySelector("td:nth-child(4) input")?.value) || 0;
  const cost = parseFloat(row.querySelector(".cost")?.textContent.replace(/[^\d.]/g, "")) || 0;

  const matched = getAllLatestMaterials().find(m => String(m.code) === String(code));
  const nameText = matched?.name || "";

  if (code || ratio > 0) {
    recipe.push({
      materialCode: code,
      materialName: nameText,
      code,
      price,
      ratio,
      cost
    });
  }
});

const newProduct = {
  id: Date.now(),
  type,
  name,
  costPerKg,   // 저장 당시 원가
  unitCost,
  volume,
  unit,
  density,
  recipe,
  lastUpdated: new Date().toISOString(),  // 🔥 이 줄 추가
  date: new Date().toISOString()
};
  
  products.push(newProduct);
  saveAll();
  loadProducts();
  // 🔥 추가 (핵심) 0319 저장하면 초기
resetRecipeTable();
};

// =============================
// 목록
// =============================
function loadMaterials() {
  const list = document.getElementById("materialList");
  const keyword = (document.getElementById("materialSearch")?.value || "").toLowerCase();

  list.innerHTML = "";

  const data = getAllLatestMaterials().filter(
    (m) =>
      m.name.toLowerCase().includes(keyword) ||
      String(m.code).toLowerCase().includes(keyword)
  );

  if (!data.length) {
    list.innerHTML = `<tr><td colspan="7">데이터 없음</td></tr>`;
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
      <td><button onclick="deleteMaterial('${m.code}')">삭제</button></td>
    </tr>
  `;
});
}

// =============================
// 삭제
// =============================
window.deleteMaterial = function(code) {
  if (!confirm("삭제하시겠습니까?")) return;
  materials = materials.filter((m) => m.code !== code);
  saveAll();
  loadMaterials();
}
  window.editMaterial = function(code) {
  const material = materials.find(m => String(m.code) === String(code));
  if (!material) return;

  document.getElementById("materialCode").value = material.code;
  document.getElementById("materialName").value = material.name;
  document.getElementById("materialPrice").value = material.price;
  document.getElementById("materialDate").value = material.date;

  // 기존 데이터 제거 (수정용)
  materials = materials.filter(m => m.code !== code);

  saveAll();
  loadMaterials();
}
window.loadProduct = function(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById("productName").value = product.name || "";
  document.getElementById("productType").value = product.type || "";
  // 🔥 이 2줄 추가
document.getElementById("productVolume").value = product.volume || 0;
document.getElementById("productUnit").value = product.unit || "g";
document.getElementById("productDensity").value = product.density || 1;

  const tbody = document.querySelector("#recipeTable tbody");
  tbody.innerHTML = "";

  (product.recipe || []).forEach(item => {
  const latest = getLatestRecordByCode(item.code);
  const livePrice = latest ? latest.price : item.price;
  const liveCost = livePrice * (item.ratio / 100);
    
  const materialsList = getAllLatestMaterials();
const options = materialsList.map(m =>
  `<option value="${m.name}"></option>`
).join("");

const row = document.createElement("tr");
row.innerHTML = `
  <td>
    <input list="materialListOptions" value="${item.materialName || ""}" oninput="updateRecipeRow(this)" placeholder="원재료명 입력" />
    <datalist id="materialListOptions">
      ${options}
    </datalist>
  </td>
  <td class="code">${item.code || ""}</td>

<td class="price" data-price="${livePrice}">
  ${formatNumber(item.price)}
  ${livePrice !== item.price 
    ? `<span style="color:red; font-weight:600;">
         → ${formatNumber(livePrice)} (${latest.date})
       </span>` 
    : ""}
</td>

<td>
  <input type="number" value="${item.ratio || 0}" oninput="updateRecipeCalc()" />
</td>

<td class="cost">
  ${Math.round(item.cost)}
  ${liveCost !== item.cost 
    ? `<span style="color:red; font-weight:600;"> → ${Math.round(liveCost)}</span>` 
    : ""}
</td>

<td>
  <button onclick="this.closest('tr').remove(); updateRecipeCalc();">삭제</button>
</td>
`;
tbody.appendChild(row);
  });

  updateRecipeCalc();
}
window.resetRecipeTable = function () {

  // 1. 배합표 초기화
  const tbody = document.querySelector("#recipeTable tbody");
  if (tbody) tbody.innerHTML = "";

  // 2. 합계 초기화
  document.getElementById("ratioTotal").innerText = "0.0";
  document.getElementById("materialCostSum").innerText = "0";
  document.getElementById("ratioSum").innerText = "0.0";
  document.getElementById("costSum").innerText = "0 원";

  // 3. 입력값 초기화
  document.getElementById("productVolume").value = "";
  document.getElementById("productUnit").value = "g";
  document.getElementById("productDensity").value = "1";

  // 🔥 추가
  document.getElementById("productName").value = "";
  document.getElementById("productType").value = "";
  
  // 4. 단위원가 초기화
  document.getElementById("recipeUnitCost").value = "0";

  console.log("초기화 완료");
};

// =============================
// 히스토리
// =============================
function loadPriceHistory(keyword = "") {
  const table = document.getElementById("priceHistoryTable");

  table.innerHTML = "";

  // 🔥 검색 없으면 그냥 아무것도 안 보여줌
  if (!keyword) return;

  const filtered = materials.filter(m =>
   m.name.toLowerCase().includes(keyword.toLowerCase()) ||
String(m.code) === String(keyword)      // 여기 수정 0319 검색할때 지정된 값만 나오게
  );

  filtered.forEach((m) => {
    table.innerHTML += `
      <tr>
        <td>${m.code}</td>
        <td>${m.name}</td>
        <td>${m.price}</td>
        <td>${m.date}</td>
        <td><button onclick="deletePriceHistory(${m.id})">삭제</button></td>
      </tr>
    `;
  });
}

function deletePriceHistory(id) {
  materials = materials.filter((m) => m.id !== id);
  saveAll();
  loadPriceHistory();
}
// =============================
// 실시간 원가 계산 (🔥 여기 추가) 0319
// =============================
function calculateLiveCost(product) {
  let total = 0;

  product.recipe.forEach(item => {
    const latest = getLatestRecordByCode(item.code);

    if (!latest) return;

    const price = latest.price;
    const ratio = item.ratio;

    total += price * (ratio / 100);
  });

  return Math.round(total);
}


// =============================
// 배합표 - 원재료 추가
// =============================
function addRecipe() {
  const tbody = document.querySelector("#recipeTable tbody");
  const materials = getAllLatestMaterials();

  // 🔥 이름 기준으로 변경
  const options = materials.map(m => 
    `<option value="${m.name}"></option>`
  ).join("");

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <input 
        list="materialListOptions" 
        oninput="updateRecipeRow(this)" 
        placeholder="원재료명 입력" 
      />
      <datalist id="materialListOptions">
        ${options}
      </datalist>
    </td>

    <td class="code"></td>
    <td class="price" data-price="0">0</td>

    <td>
      <input type="number" value="0" oninput="updateRecipeCalc()" />
    </td>

    <td class="cost">0</td>

    <td>
      <button onclick="this.closest('tr').remove(); updateRecipeCalc();">삭제</button>
    </td>
  `;

  tbody.appendChild(row);
}
// =============================
// 선택 시 자동 입력
// =============================
function updateRecipeRow(input) {
  const value = input.value.trim();
  const row = input.closest("tr");

  const materials = getAllLatestMaterials();

  // 🔥 이름 기준 매칭
  const material = materials.find(m => m.name === value);

  if (!material) {
    row.querySelector(".code").innerText = "";
    row.querySelector(".price").innerText = "0";
    row.querySelector(".price").dataset.price = "0";
    row.querySelector(".cost").innerText = "0";
    updateRecipeCalc();
    return;
  }

  // 🔥 내부 값 세팅
  row.querySelector(".code").innerText = material.code;

  row.querySelector(".price").innerText = material.price;
  row.querySelector(".price").dataset.price = material.price;

  updateRecipeCalc();
}
// =============================
// 계산
// =============================
function updateRecipeCalc() {
  let totalRatio = 0;
  let totalCost = 0;

  document.querySelectorAll("#recipeTable tbody tr").forEach(row => {
    const price = parseFloat(row.querySelector(".price")?.dataset.price) || 0;
    const ratio = parseFloat(row.querySelector("td:nth-child(4) input")?.value) || 0;

    const cost = price * (ratio / 100);

    row.querySelector(".cost").innerText = Math.round(cost);

    totalRatio += ratio;
    totalCost += cost;
  });

  document.getElementById("ratioTotal").innerText = totalRatio.toFixed(1);
  document.getElementById("materialCostSum").innerText = Math.round(totalCost);
  document.getElementById("ratioSum").innerText = totalRatio.toFixed(1);
  document.getElementById("costSum").innerText = Math.round(totalCost) + " 원";
  updateUnitCost();
}
function deleteProduct(id) {
  const ok = confirm("이 제품을 삭제할까요?");
  if (!ok) return;

  products = products.filter((p) => p.id !== id);
  saveAll();
  loadProducts();
}
// =============================
// 초기 실행
// =============================
loadMaterials();
loadPriceHistory();
function loadCalcProducts() {
  const select = document.getElementById("calcProductSelect");
  if (!select) return;

  select.innerHTML = `<option value="">선택</option>`;

  products.forEach(p => {
    select.innerHTML += `
      <option value="${p.id}">
        ${p.name}
      </option>
    `;
  });
}
window.loadMaterialCostFromProduct = function () {
  const select = document.getElementById("calcProductSelect");
  const productId = select.value;

  if (!productId) return;

  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  document.getElementById("materialCostInput").value = product.costPerKg || 0;
};
window.calculateCost = function () {
  const material = parseFloat(document.getElementById("materialCostInput").value) || 0;
  const mfg = parseFloat(document.getElementById("mfg").value) || 0;
  const pack = parseFloat(document.getElementById("pack").value) || 0;
  const logi = parseFloat(document.getElementById("logi").value) || 0;
  const margin = parseFloat(document.getElementById("margin").value) || 0;

  const baseCost = material + mfg + pack + logi;
  const finalCost = baseCost * (1 + margin / 100);

  document.getElementById("unitCost").value = finalCost.toFixed(2);

  console.log("총원가:", baseCost);
  console.log("견적가:", finalCost);
};

// =============================
// 선택 기능 (견적 조회)
// =============================

function toggleAll(el) {
  document.querySelectorAll(".rowCheck").forEach(cb => {
    cb.checked = el.checked;
  });
}

function deleteSelected() {
  const checked = Array.from(document.querySelectorAll(".rowCheck:checked"))
    .map(cb => Number(cb.value));

  if (!checked.length) {
    alert("삭제할 항목을 선택하세요.");
    return;
  }

  if (!confirm("선택한 항목을 삭제할까요?")) return;

  quotes = quotes.filter(q => !checked.includes(Number(q.id)));

  saveAll();
  loadQuotes();
}
window.deleteSelectedProducts = function () {
  const checked = Array.from(document.querySelectorAll(".rowCheck:checked"))
    .map(cb => Number(cb.value));

  if (!checked.length) {
    alert("삭제할 제품을 선택하세요.");
    return;
  }

  if (!confirm("선택한 제품을 삭제할까요?")) return;

  products = products.filter(p => !checked.includes(Number(p.id)));

  saveAll();
  loadProducts();
};

function loadSelected() {
  const checked = document.querySelector(".rowCheck:checked");

  if (!checked) {
    alert("하나 선택하세요.");
    return;
  }

  loadQuote(checked.value);
}
function loadQuotes() {
  const list = document.getElementById("quoteList");
  list.innerHTML = "";

  if (!quotes || quotes.length === 0) {
    list.innerHTML = `<tr><td colspan="7">데이터 없음</td></tr>`;
    return;
  }

  quotes.forEach((q) => {
    list.innerHTML += `
      <tr>
        <td><input type="checkbox" class="rowCheck" value="${q.id}"></td>
        <td>${q.type || ""}</td>
        <td>${q.name || ""}</td>
        <td>${formatNumber(q.cost)} 원</td>
        <td>${formatNumber(q.unitCost)} 원</td>
        <td>${q.date || ""}</td>
        <td>
        <button type="button" onclick="loadQuote('${q.id}')">불러오기</button>
        </td>
      </tr>
    `;
  });
}
console.log("끝까지 실행됨");
// =============================
// 부재료 데이터
// =============================
let subMaterials = JSON.parse(localStorage.getItem("subMaterials")) || [];

// =============================
// 저장 확장
// =============================
const originalSaveAll = saveAll;
saveAll = function () {
  originalSaveAll();
  localStorage.setItem("subMaterials", JSON.stringify(subMaterials));
};

// =============================
// 페이지 전환 추가
// =============================
const originalShowPage = window.showPage;
window.showPage = function (id) {
  originalShowPage(id);

  if (id === "subDb") {
    loadSubMaterials();
    loadSubPriceHistory(document.getElementById("subPriceSearch")?.value || "");
  }
};

// =============================
// 입력 초기화
// =============================
function clearSubMaterialInputs() {
  document.getElementById("subMaterialCode").value = "";
  document.getElementById("subMaterialName").value = "";
  document.getElementById("subMaterialPrice").value = "";
  document.getElementById("subMaterialDate").value = "";
}

// =============================
// 저장
// =============================
function saveSubMaterial() {
  const code = document.getElementById("subMaterialCode").value.trim();
  const name = document.getElementById("subMaterialName").value.trim();
  const price = Number(document.getElementById("subMaterialPrice").value);
  const date = normalizeDate(document.getElementById("subMaterialDate").value);

  if (!code || !name || date === "") {
    alert("모든 항목 입력");
    return;
  }
  // 🔥 이름 중복 체크
  const existsName = subMaterials.some(m =>
    m.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existsName) {
    alert("같은 부재료명이 이미 존재합니다!");
    return;
  }

  // 🔥 코드 중복 체크
  const existsCode = subMaterials.some(m =>
    String(m.code) === String(code)
  );

  if (existsCode) {
    alert("같은 코드가 이미 존재합니다!");
    return;
  }

  subMaterials.push({
    id: Date.now(),
    code,
    name,
    price,
    date
  });

  saveAll();
  loadSubMaterials();
  loadSubPriceHistory("");
}

// =============================
// 목록
// =============================
function getAllLatestSubMaterials() {
  const map = {};

  subMaterials.forEach((m) => {
    const key = String(m.code);

    if (!map[key] || new Date(m.date) > new Date(map[key].date)) {
      map[key] = m;
    }
  });

  return Object.values(map);
}

function loadSubMaterials() {
  const list = document.getElementById("subMaterialList");
  const keyword = (document.getElementById("subMaterialSearch")?.value || "").toLowerCase();

  list.innerHTML = "";

  const data = getAllLatestSubMaterials().filter(
    (m) =>
      m.name.toLowerCase().includes(keyword) ||
      String(m.code).toLowerCase().includes(keyword)
  );

  if (!data.length) {
    list.innerHTML = `<tr><td colspan="7">데이터 없음</td></tr>`;
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
        <td><button onclick="editSubMaterial('${m.code}')">수정</button></td>
        <td><button onclick="deleteSubMaterial('${m.code}')">삭제</button></td>
      </tr>
    `;
  });
}

// =============================
// 삭제 / 수정
// =============================
function deleteSubMaterial(code) {
  if (!confirm("삭제하시겠습니까?")) return;
  subMaterials = subMaterials.filter((m) => m.code !== code);
  saveAll();
  loadSubMaterials();
}

function editSubMaterial(code) {
  const material = subMaterials.find(m => String(m.code) === String(code));
  if (!material) return;

  document.getElementById("subMaterialCode").value = material.code;
  document.getElementById("subMaterialName").value = material.name;
  document.getElementById("subMaterialPrice").value = material.price;
  document.getElementById("subMaterialDate").value = material.date;

  subMaterials = subMaterials.filter(m => m.code !== code);

  saveAll();
  loadSubMaterials();
}

// =============================
// 히스토리
// =============================
function loadSubPriceHistory(keyword = "") {
  const table = document.getElementById("subPriceHistoryTable");
  table.innerHTML = "";

  if (!keyword) return;

  const filtered = subMaterials.filter(m =>
    m.name.toLowerCase().includes(keyword.toLowerCase()) ||
    String(m.code).includes(keyword)
  );

  filtered.forEach((m) => {
    table.innerHTML += `
      <tr>
        <td>${m.code}</td>
        <td>${m.name}</td>
       <td>${formatNumber(m.price)} 원</td>
        <td>${m.date}</td>
        <td><button onclick="deleteSubPriceHistory(${m.id})">삭제</button></td>
      </tr>
    `;
  });
}

function searchSubPriceHistory() {
  const keyword = document.getElementById("subPriceSearch").value;
  loadSubPriceHistory(keyword);
}

function deleteSubPriceHistory(id) {
  subMaterials = subMaterials.filter((m) => m.id !== id);
  saveAll();
  loadSubPriceHistory("");
}
function handleSubExcelUpload() {
  const fileInput = document.getElementById("subExcelFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("엑셀 파일을 선택해주세요.");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows.length) {
      alert("엑셀 데이터가 없습니다.");
      return;
    }

    rows.forEach((row) => {
      const code = String(row["코드"] || "").trim();
      const name = String(row["이름"] || "").trim();

      const rawPrice = row["단가"] || "0";

      const price = parseFloat(
        String(rawPrice).replace(/[^\d.]/g, "")
      ) || 0;

      const date = new Date().toISOString().slice(0, 10);

      if (!code || !name) return;

      subMaterials.push({
        id: Date.now() + Math.random(),
        code,
        name,
        price,
        date
      });
    });

    saveAll();
    loadSubMaterials();
    loadSubPriceHistory("");

    fileInput.value = "";
    alert("부재료 엑셀 업로드 완료");
  };

  reader.readAsArrayBuffer(file);
}
