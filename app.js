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

   tr.innerHTML = `
  <td>${p.type || "-"}</td>
  <td>${p.name}</td>
  <td>${formatNumber(p.costPerKg)} 원</td>
  <td>${formatNumber(p.unitCost)} 원</td>
  <td>${new Date(p.date).toLocaleString("ko-KR")}</td>
  <td>
    <button onclick="loadProduct(${p.id})">불러오기</button>
    <button onclick="deleteProduct(${p.id})">삭제</button>
  </td>
`;

    tbody.appendChild(tr);
  });
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
  const rows = materials.filter((m) => String(m.code) === String(code));
  if (rows.length === 0) return null;
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  return rows[0];
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

function getLatestPriceByCode(code) {
  const latest = getLatestRecordByCode(code);
  return latest ? Number(latest.price || 0) : 0;
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
// =============================
// 원가 계산
// =============================
window.updateUnitCost = function () {
  updateRecipeCalc(); // 🔥 이거 추가
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

  console.log("volume:", volume);
  console.log("unit:", unit);
  console.log("density:", density);
  console.log("costText:", costText);
  console.log("원/kg:", totalCostPerKg);
  console.log("단위원가:", unitCost);
};



window.saveRecipe = function () {
  const name = document.getElementById("productName")?.value.trim();
  const type = document.getElementById("productType")?.value;

  if (!name) {
    alert("제품명을 입력하세요");
    return;
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
    const select = row.querySelector("select");
    const code = row.querySelector(".code")?.textContent || "";
    const price = parseFloat(row.querySelector(".price")?.textContent) || 0;
    const ratio = parseFloat(row.querySelector("input")?.value) || 0;
    const cost = parseFloat(row.querySelector(".cost")?.textContent) || 0;
    const nameText = select?.options[select.selectedIndex]?.text || "";

    if (code || ratio > 0) {
      recipe.push({
        materialCode: select?.value || "",
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
  costPerKg,
  unitCost,
  volume,   // 🔥 추가
  unit,     // 🔥 추가
  density,  // 🔥 추가
  recipe,
  date: new Date().toISOString()
};

  products.push(newProduct);
  saveAll();
  loadProducts();
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
function deleteMaterial(code) {
  if (!confirm("삭제?")) return;
  materials = materials.filter((m) => m.code !== code);
  saveAll();
  loadMaterials();
}
window.loadProduct = function(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById("productName").value = product.name || "";
  document.getElementById("productType").value = product.type || "";
  document.getElementById("recipeUnitCost").value = Number(product.unitCost || 0).toFixed(2);
  // 🔥 이 3줄 추가
document.getElementById("productVolume").value = product.volume || 0;
document.getElementById("productUnit").value = product.unit || "g";
document.getElementById("productDensity").value = product.density || 1;

  const tbody = document.querySelector("#recipeTable tbody");
  tbody.innerHTML = "";

  (product.recipe || []).forEach(item => {
    const materialsList = getAllLatestMaterials();
    const options = materialsList.map(m => {
      const selected = String(m.code) === String(item.materialCode) ? "selected" : "";
      return `<option value="${m.code}" ${selected}>${m.name}</option>`;
    }).join("");

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <select onchange="updateRecipeRow(this)">
          <option value="">선택</option>
          ${options}
        </select>
      </td>
      <td class="code">${item.code || ""}</td>
      <td class="price">${item.price || 0}</td>
      <td>
        <input type="number" value="${item.ratio || 0}" oninput="updateRecipeCalc()" />
      </td>
      <td class="cost">${item.cost || 0}</td>
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
function loadPriceHistory() {
  const table = document.getElementById("priceHistoryTable");
  table.innerHTML = "";

  materials.forEach((m) => {
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
// 배합표 - 원재료 추가
// =============================
function addRecipe() {
  const tbody = document.querySelector("#recipeTable tbody");
  const materials = getAllLatestMaterials();

  const options = materials.map(m => 
    `<option value="${m.name}" data-code="${m.code}"></option>`
  ).join("");

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <input list="materialListOptions" oninput="updateRecipeRow(this)" placeholder="원재료 검색" />
      <datalist id="materialListOptions">
        ${options}
      </datalist>
    </td>
    <td class="code"></td>
    <td class="price">0</td>
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
  const name = input.value;
  const row = input.closest("tr");

  if (!name) return;

  const materials = getAllLatestMaterials();

  // 🔥 name으로 찾기
  const material = materials.find(m => m.name === name);

  if (!material) {
    // ❗ 못찾으면 초기화 (NaN 방지)
    row.querySelector(".code").innerText = "";
    row.querySelector(".price").innerText = "0";
    updateRecipeCalc();
    return;
  }

  row.querySelector(".code").innerText = material.code;
  row.querySelector(".price").innerText = material.price;

  updateRecipeCalc();
}
// =============================
// 계산
// =============================
function updateRecipeCalc() {
  let totalRatio = 0;
  let totalCost = 0;

  document.querySelectorAll("#recipeTable tbody tr").forEach(row => {
    const price = parseFloat(row.querySelector(".price")?.innerText) || 0;
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
if (id === "calc") {
  loadCalcProducts();
}
