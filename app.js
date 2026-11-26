// =============================
// 데이터
// =============================
let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];
let priceHistory = JSON.parse(localStorage.getItem("priceHistory")) || [];
let editingMaterialId = null;
let idleTimer = null;
let warningTimer = null;

const IDLE_LIMIT = 10 * 60 * 1000;      // 10분
const WARNING_DURATION = 1 * 60 * 1000; // 1분
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

function formatDiffText(diff) {
  const abs = Math.abs(diff);
  return diff < 0
    ? `- ${formatNumber(abs)}`
    : `+ ${formatNumber(abs)}`;
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
function isLoggedIn() {
  return sessionStorage.getItem("isLogin") === "true";
}

function startIdleTimer() {
  clearTimeout(idleTimer);
  clearTimeout(warningTimer);

  if (!isLoggedIn()) return;

  idleTimer = setTimeout(() => {
    const keepLogin = confirm("장기간 사용하지 않아 1분 후 로그아웃됩니다.\n로그인을 연장하시겠습니까?");

    if (keepLogin) {
      resetIdleTimer();
      return;
    }

    warningTimer = setTimeout(() => {
      logout();
      alert("장시간 미사용으로 로그아웃되었습니다.");
    }, WARNING_DURATION);
  }, IDLE_LIMIT);
}

function resetIdleTimer() {
  if (!isLoggedIn()) return;
  startIdleTimer();
}

function bindActivityEvents() {
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(eventName => {
    document.addEventListener(eventName, resetIdleTimer);
  });
}
function logout() {
  sessionStorage.removeItem("isLogin");

  clearTimeout(idleTimer);
  clearTimeout(warningTimer);

  document.getElementById("mainPage").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";

  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
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
    loadMaterialCostFromProduct();
  }

  if (id === "history") {
    loadQuotes();
  }
}
// =============================
// 제품 목록 불러오기
// =============================
function loadProducts() {
  const tbody = document.getElementById("recipeProductList");
  if (!tbody) return;

  tbody.innerHTML = "";

  const keyword = document.getElementById("productSearch").value.trim().toLowerCase();
  products.filter(p => [p.name, p.type].some(value =>
    String(value ?? "").toLowerCase().includes(keyword)
  )).forEach((p) => {
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
      <td>${escapeHtml(p.type || "-")}</td>
      <td 
  style="cursor:pointer; color:#2563eb; font-weight:500;"
  onclick="loadProduct(${p.id})"
>
  ${escapeHtml(p.name)}
</td>
    <td>
  ${formatNumber(liveCost)} 원
  ${
    diff !== 0
      ? `(
          ${formatNumber(p.costPerKg)} 
          <span style="color:${diff < 0 ? '#2979ff' : '#e53935'}; font-weight:600;">
            ${formatDiffText(diff)}
          </span>
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
  const keyword = document.getElementById("priceSearch")?.value || "";
  loadPriceHistory(keyword);
}
window.showPriceHistoryByMaterial = function(code, name) {
  const input = document.getElementById("priceSearch");
  if (input) input.value = name;

  loadPriceHistoryByCode(code);
};
function loadPriceHistoryByCode(code) {
  const table = document.getElementById("priceHistoryTable");
  if (!table) return;

  table.innerHTML = "";

  const filtered = priceHistory
    .filter(m => String(m.code).trim() === String(code).trim())
    .sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));

  if (!filtered.length) {
    table.innerHTML = `<tr><td colspan="4">데이터 없음</td></tr>`;
    return;
  }

  filtered.forEach((m) => {
    table.innerHTML += `
      <tr>
        <td>${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.name)}</td>
        <td>${formatNumber(m.price)} 원</td>
        <td>${escapeHtml(m.date)}</td>
      </tr>
    `;
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
  const cleanCode = String(code).trim();

  const filtered = materials.filter((m) => 
    String(m.code).trim() === cleanCode
  );

  if (filtered.length === 0) return null;

  filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));

  return filtered[0];
}
function getAllLatestMaterials() {
  const map = Object.create(null);

  materials.forEach((m) => {
    const key = String(m.code);

    if (!map[key] || (new Date(m.date) - new Date(map[key].date) || Number(m.id) - Number(map[key].id)) > 0) {
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

  editingMaterialId = null;
}

// =============================
// 저장
// =============================
function saveMaterial() {
  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const price = Number(document.getElementById("materialPrice").value);
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (!code || !name || !date || !document.getElementById("materialPrice").value || !Number.isFinite(price) || price < 0) {
    alert("모든 항목 입력");
    return;
  }

  if (editingMaterialId) {
    const target = materials.find(m => m.id === editingMaterialId);

    if (!target) {
      alert("수정할 데이터를 찾을 수 없습니다.");
      editingMaterialId = null;
      return;
    }

    target.code = code;
    target.name = name;
    target.price = price;
    target.date = date;
    target.id = Date.now() + Math.random();
  } else {
    const existing = materials.find(m => m.code === code && m.name === name);

    if (existing) {
      const ok = confirm("동일한 원재료가 있습니다. 덮어쓰겠습니까?");
      if (!ok) return;

      existing.price = price;
      existing.date = date;
      existing.id = Date.now() + Math.random();
    } else {
      materials.push({
        id: Date.now(),
        code,
        name,
        price,
        date
      });
    }
  }

  priceHistory.push({
    id: Date.now(),
    code,
    name,
    price,
    date
  });

  editingMaterialId = null;
  saveAll();
  loadMaterials();
  loadPriceHistory("");
  clearMaterialInputs();
}




function handleExcelUpload() {
  const fileInput = document.getElementById("excelFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("엑셀 파일을 선택해주세요.");
    return;
  }
  if (typeof XLSX === "undefined") {
    alert("엑셀 업로드 라이브러리를 불러오지 못했습니다. 연결을 확인한 뒤 새로고침하세요.");
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

  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  if (!code || !name) return;

  const entry = {
    id: Date.now() + Math.random(),
    code,
    name,
    price,
    date
  };
  materials.push(entry);
  priceHistory.push({ ...entry });
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

  // ✅ 단위원가 표시
  const costDisplay = document.getElementById("unitCostDisplay");
  if (costDisplay) {
    costDisplay.innerText = formatNumber(Math.round(unitCost));
  }

  // ✅ 내용량 표시 (이게 핵심🔥)
 const volumeDisplay = document.getElementById("volumeDisplayText");
 if (volumeDisplay) {
  volumeDisplay.innerText = `${volume} ${unit}`;
}
};

window.saveRecipe = function () {
  const name = document.getElementById("productName")?.value.trim();
  const type = document.getElementById("productType")?.value || "일반";

  if (!name) {
    alert("제품명을 입력하세요");
    return;
  }
  const existingIndex = products.findIndex(p => p.name === name);
  const costEl = document.getElementById("materialCostSum");
  const costText = costEl ? costEl.textContent.trim() : "0";
  const costPerKg = parseFloat(costText.replace(/[^\d.]/g, "")) || 0;

  const unitCost =
  parseFloat((document.getElementById("unitCostDisplay")?.innerText || "0").replace(/[^\d.]/g, "")) || 0;
  const volume = parseFloat(document.getElementById("productVolume")?.value) || 0;
const unit = document.getElementById("productUnit")?.value || "g";
const density = parseFloat(document.getElementById("productDensity")?.value) || 1;

  const recipe = [];
 document.querySelectorAll("#recipeTable tbody tr").forEach(row => {
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

  const totalRatio = recipe.reduce((sum, item) => sum + item.ratio, 0);
  if (recipe.some(item => !item.code || !Number.isFinite(item.ratio) || item.ratio <= 0) ||
      Math.abs(totalRatio - 100) > 0.000001) {
    alert("등록된 원재료를 선택하고 각 배합비를 0보다 크게, 합계는 100%로 입력하세요.");
    return;
  }
  if (!Number.isFinite(volume) || volume <= 0 ||
      (unit === "ml" && !(Number(document.getElementById("productDensity").value) > 0))) {
    alert("내용량과 mL 환산에 사용하는 비중을 0보다 크게 입력하세요.");
    return;
  }
  if (existingIndex !== -1 && !confirm("이미 동일한 제품이 있습니다. 덮어쓰시겠습니까?")) return;

const newProduct = {
  id: products[existingIndex]?.id ?? Date.now(),
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
  
  if (existingIndex === -1) products.push(newProduct);
  else products[existingIndex] = newProduct;
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
      <td>${escapeHtml(m.code)}</td>
      <td
  style="cursor:pointer; color:#2563eb; font-weight:500;"
  onclick="showPriceHistoryByMaterial('${escapeHtml(escapeJsString(m.code))}', '${escapeHtml(escapeJsString(m.name))}')"
>
  ${escapeHtml(m.name)}
</td>
      <td>${formatNumber(m.price)} 원</td>
      <td>${escapeHtml(m.date)}</td>
      <td><button onclick="editMaterial('${escapeHtml(escapeJsString(m.code))}')">수정</button></td>
      <td><button onclick="deleteMaterial('${escapeHtml(escapeJsString(m.code))}')">삭제</button></td>
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
  const material = getLatestRecordByCode(code);
  if (!material) return;

  document.getElementById("materialCode").value = material.code;
  document.getElementById("materialName").value = material.name;
  document.getElementById("materialPrice").value = material.price;
  document.getElementById("materialDate").value = material.date;

  // 수정 중인 항목 id만 기억
  editingMaterialId = material.id;
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
  `<option value="${escapeHtml(m.name)}"></option>`
).join("");

const row = document.createElement("tr");
const listId = "material-options-" + nextRecipeListId++;
row.innerHTML = `
  <td>
    <input list="${listId}" value="${escapeHtml(item.materialName || "")}" oninput="updateRecipeRow(this)" placeholder="원재료명 입력" />
    <datalist id="${listId}">
      ${options}
    </datalist>
  </td>
  <td class="code">${escapeHtml(item.code || "")}</td>

<td class="price" data-price="${livePrice}">
  ${formatNumber(item.price)}
  ${latest && livePrice !== item.price 
    ? `<span style="color:red; font-weight:600;">
         → ${formatNumber(livePrice)} (${escapeHtml(latest.date)})
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
 <button class="delete-btn" onclick="this.closest('tr').remove(); updateRecipeCalc();">
  삭제
</button>
</td>
`;
tbody.appendChild(row);
  });

  updateRecipeCalc();
}
window.resetRecipeTable = function () {
  const tbody = document.querySelector("#recipeTable tbody");
  if (tbody) tbody.innerHTML = "";

  document.getElementById("ratioSum").innerText = "0.0";
  document.getElementById("materialCostSum").innerText = "0";
  document.getElementById("unitCostDisplay").innerText = "0";

  document.getElementById("productVolume").value = "";
  document.getElementById("productUnit").value = "g";
  document.getElementById("productDensity").value = "1";
  document.getElementById("productName").value = "";
  document.getElementById("productType").value = "";

  document.getElementById("volumeDisplayText").textContent = "";
};

// =============================
// 히스토리
// =============================
function loadPriceHistory(keyword = "") {
  const table = document.getElementById("priceHistoryTable");
  if (!table) return;

  table.innerHTML = "";

  const search = String(keyword).trim().toLowerCase();

  let filtered = priceHistory;

  // 검색어가 있으면 이름/코드 부분검색
  if (search) {
    filtered = priceHistory.filter(m =>
      String(m.code || "").toLowerCase().includes(search) ||
      String(m.name || "").toLowerCase().includes(search)
    );
  }

  // 최신순 정렬
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));
if (!filtered.length) {
  table.innerHTML = `<tr><td colspan="4">데이터 없음</td></tr>`;
  return;
}

filtered.forEach((m) => {
  table.innerHTML += `
    <tr>
      <td>${escapeHtml(m.code)}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${formatNumber(m.price)} 원</td>
      <td>${escapeHtml(m.date)}</td>
    </tr>
  `;
});

  
}

function deletePriceHistory(id) {
  priceHistory = priceHistory.filter((m) => m.id !== id);
  saveAll();
  loadPriceHistory(document.getElementById("priceSearch")?.value || "");
}
// =============================
// 실시간 원가 계산 (🔥 여기 추가) 0319
// =============================
function calculateLiveCost(product) {
  let total = 0;

  (product.recipe || []).forEach(item => {
    const latest = getLatestRecordByCode(item.code);

    const price = Number(latest?.price ?? item.price) || 0;
    const ratio = Number(item.ratio) || 0;

    total += price * (ratio / 100);
  });

  return Math.round(total);
}


// =============================
// 배합표 - 원재료 추가
// =============================
let nextRecipeListId = 0;

function addRecipe() {
  const tbody = document.querySelector("#recipeTable tbody");
  const materials = getAllLatestMaterials();

  // 🔥 이름 기준으로 변경
  const options = materials.map(m => 
    `<option value="${escapeHtml(m.name)}"></option>`
  ).join("");

  const row = document.createElement("tr");

  const listId = "material-options-" + nextRecipeListId++;
  row.innerHTML = `
    <td>
      <input 
        list="${listId}" 
        oninput="updateRecipeRow(this)" 
        placeholder="원재료명 입력" 
      />
      <datalist id="${listId}">
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

  row.querySelector(".price").innerText = formatNumber(material.price);
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

    row.querySelector(".cost").innerText = formatNumber(Math.round(cost));

    totalRatio += ratio;
    totalCost += cost;
  });

  document.getElementById("ratioSum").innerText = totalRatio.toFixed(1);
  document.getElementById("materialCostSum").innerText = formatNumber(Math.round(totalCost));

  updateUnitCost();
}
function deleteProduct(id) {
  const ok = confirm("이 제품을 삭제할까요?");
  if (!ok) return;

  products = products.filter((p) => p.id !== id);
  saveAll();
  loadProducts();
}
async function exportSelectedProductExcel() {
  const selected = document.querySelectorAll("#recipeProductList .rowCheck:checked");
  if (!selected.length) {
    alert("다운로드할 제품을 선택하세요.");
    return;
  }
  if (typeof ExcelJS === "undefined") {
    alert("엑셀 다운로드 라이브러리를 불러오지 못했습니다. 연결을 확인한 뒤 새로고침하세요.");
    return;
  }

  try {
    for (const checkbox of selected) {
      const product = products.find(p => String(p.id) === checkbox.value);
      if (!product) continue;
      const rows = (product.recipe || []).map(item => {
        const latest = getLatestRecordByCode(item.code);
        const latestPrice = latest?.price ?? item.price;
        return {
          materialName: item.materialName || latest?.name || "",
          code: item.code,
          savedPrice: item.price,
          latestPrice,
          ratio: item.ratio,
          savedCost: item.cost,
          latestCost: Math.round(latestPrice * item.ratio / 100),
          diff: latestPrice - item.price,
          increaseDate: latestPrice !== item.price ? latest?.date || "" : ""
        };
      });
      await downloadStyledRecipeExcel(product, rows);
    }
  } catch (error) {
    console.error(error);
    alert("엑셀 다운로드 중 오류가 발생했습니다.");
  }
}

function sanitizeSheetName(name) {
  return (String(name || "배합표")
    .replace(/[\\/*?:[\]]/g, "")
    .slice(0, 31).replace(/^'+|'+$/g, "") || "배합표");
}

async function downloadStyledRecipeExcel(product, recipeRows) {
  // product 예시:
  // {
  //   name: "오늘은조퇴",
  //   type: "가공치즈",
  //   savedAt: "2026-04-03 10:09:52",
  //   savedCost: 4800,
  //   unitCost: 14400
  // }

  // recipeRows 예시:
  // [
  //   {
  //     materialName: "테스트10",
  //     code: "1",
  //     savedPrice: 4000,
  //     latestPrice: 8000,
  //     ratio: 40,
  //     savedCost: 1600,
  //     latestCost: 3200,
  //     diff: 4000,
  //     increaseDate: "2026-04-03"
  //   }
  // ]

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sanitizeSheetName(`${product.name} 배합표`), {
    views: [{ state: "frozen", ySplit: 9 }]
  });

  // 열 너비
  ws.columns = [
    { width: 6 },   // A No
    { width: 20 },  // B 원재료
    { width: 10 },  // C 코드
    { width: 12 },  // D 저장단가
    { width: 12 },  // E 최신단가
    { width: 12 },  // F 배합비
    { width: 12 },  // G 저장원가
    { width: 12 },  // H 최신원가
    { width: 12 },  // I 변동
    { width: 14 }   // J 인상일
  ];

  const borderThin = {
    top: { style: "thin", color: { argb: "FFD9D9D9" } },
    left: { style: "thin", color: { argb: "FFD9D9D9" } },
    bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    right: { style: "thin", color: { argb: "FFD9D9D9" } }
  };

  const titleFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F4E78" }
  };

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2F75B5" }
  };

  const labelFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" }
  };

  const totalFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEAF3FF" }
  };

  const changedFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFF2CC" }
  };

  // 제목
  ws.mergeCells("A1:J1");
  ws.getCell("A1").value = `${product.name} 배합표`;
  ws.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" }
  };
  ws.getCell("A1").alignment = {
    horizontal: "center",
    vertical: "middle"
  };
  ws.getCell("A1").fill = titleFill;
  ws.getCell("A1").border = borderThin;
  ws.getRow(1).height = 26;

  // 상단 정보
  const metaRows = [
    ["제품명", product.name],
    ["유형", product.type],
    ["저장일", product.savedAt ?? new Date(product.date).toLocaleString("ko-KR")],
    ["저장 원가 (원/kg)", product.savedCost ?? product.costPerKg],
    ["단위원가", product.unitCost]
  ];

  metaRows.forEach((item, idx) => {
    const rowNum = 3 + idx;

    ws.getCell(`A${rowNum}`).value = item[0];
    ws.getCell(`A${rowNum}`).fill = labelFill;
    ws.getCell(`A${rowNum}`).font = { bold: true };
    ws.getCell(`A${rowNum}`).border = borderThin;
    ws.getCell(`A${rowNum}`).alignment = {
      vertical: "middle",
      horizontal: "center"
    };

    ws.getCell(`B${rowNum}`).value = item[1];
    ws.getCell(`B${rowNum}`).border = borderThin;
    ws.getCell(`B${rowNum}`).alignment = {
      vertical: "middle",
      horizontal: rowNum >= 6 ? "right" : "left"
    };
  });

  ws.getCell("B6").numFmt = "#,##0";
  ws.getCell("B7").numFmt = "#,##0";

  // 헤더
  const headerRow = 9;
  const headers = [
    "No", "원재료", "코드", "저장단가", "최신단가",
    "배합비(%)", "저장원가", "최신원가", "변동", "인상일"
  ];

  headers.forEach((text, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = text;
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderThin;
  });

  ws.getRow(headerRow).height = 22;
  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: 10 }
  };

  // 데이터
  recipeRows.forEach((item, idx) => {
    const rowNum = headerRow + 1 + idx;

    const values = [
      idx + 1,
      item.materialName,
      item.code,
      item.savedPrice,
      item.latestPrice,
      item.ratio,
      item.savedCost,
      item.latestCost,
      item.diff,
      item.increaseDate || ""
    ];

    values.forEach((value, colIdx) => {
      const cell = ws.getCell(rowNum, colIdx + 1);
      cell.value = value;
      cell.border = borderThin;
      cell.alignment = {
        vertical: "middle",
        horizontal: [1, 3].includes(colIdx + 1) ? "center"
          : [2].includes(colIdx + 1) ? "left"
          : "right"
      };
    });

    // 숫자 포맷
    ["D", "E", "G", "H", "I"].forEach(col => {
      ws.getCell(`${col}${rowNum}`).numFmt = '#,##0;[Red](#,##0)';
    });
    ws.getCell(`F${rowNum}`).numFmt = '0.0';
    ws.getCell(`J${rowNum}`).numFmt = 'yyyy-mm-dd';

    // 변동 강조
    if (Number(item.savedPrice) !== Number(item.latestPrice)) {
      ["E", "H", "I", "J"].forEach(col => {
        ws.getCell(`${col}${rowNum}`).fill = changedFill;
      });
      ws.getCell(`I${rowNum}`).font = {
        bold: true,
        color: { argb: "FFC00000" }
      };
    }
  });

  // 합계
  const totalRow = headerRow + recipeRows.length + 2;

  ws.mergeCells(`A${totalRow}:E${totalRow}`);
  ws.getCell(`A${totalRow}`).value = "합계";
  ws.getCell(`A${totalRow}`).font = { bold: true };
  ws.getCell(`A${totalRow}`).fill = totalFill;
  ws.getCell(`A${totalRow}`).alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell(`A${totalRow}`).border = borderThin;

  ["F", "G", "H"].forEach(col => {
    ws.getCell(`${col}${totalRow}`).fill = totalFill;
    ws.getCell(`${col}${totalRow}`).font = { bold: true };
    ws.getCell(`${col}${totalRow}`).border = borderThin;
  });

  ws.getCell(`F${totalRow}`).value = {
    formula: `SUM(F${headerRow + 1}:F${headerRow + recipeRows.length})`
  };
  ws.getCell(`G${totalRow}`).value = {
    formula: `SUM(G${headerRow + 1}:G${headerRow + recipeRows.length})`
  };
  ws.getCell(`H${totalRow}`).value = {
    formula: `SUM(H${headerRow + 1}:H${headerRow + recipeRows.length})`
  };

  ws.getCell(`F${totalRow}`).numFmt = "0.0";
  ws.getCell(`G${totalRow}`).numFmt = "#,##0";
  ws.getCell(`H${totalRow}`).numFmt = "#,##0";

  // 단위원가
  const unitRow = totalRow + 1;
  ws.mergeCells(`A${unitRow}:G${unitRow}`);
  ws.getCell(`A${unitRow}`).value = "단위원가";
  ws.getCell(`A${unitRow}`).font = { bold: true };
  ws.getCell(`A${unitRow}`).fill = totalFill;
  ws.getCell(`A${unitRow}`).alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell(`A${unitRow}`).border = borderThin;

  ws.getCell(`H${unitRow}`).value = product.unitCost;
  ws.getCell(`H${unitRow}`).numFmt = "#,##0";
  ws.getCell(`H${unitRow}`).font = { bold: true };
  ws.getCell(`H${unitRow}`).fill = totalFill;
  ws.getCell(`H${unitRow}`).border = borderThin;
  ws.getCell(`H${unitRow}`).alignment = { horizontal: "right", vertical: "middle" };

  // 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob(
    [buffer],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${product.name}_배합표.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
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
        ${escapeHtml(p.name)}
      </option>
    `;
  });
}
let activeQuote = null;

function showQuoteResult(quote) {
  const fields = {
    calcProductName: quote?.name || "-",
    materialCostText: quote?.material ?? 0,
    extraCostText: quote?.extra ?? 0,
    totalCostText: quote?.cost ?? 0,
    result: quote?.unitCost ?? 0
  };

  for (const [id, value] of Object.entries(fields)) {
    document.getElementById(id).textContent =
      typeof value === "number" ? value.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) : value;
  }
  document.getElementById("calcUnitCost").value = quote ? quote.cost.toFixed(2) : "";
}

window.loadMaterialCostFromProduct = function () {
  activeQuote = null;
  const id = document.getElementById("calcProductSelect").value;
  const product = products.find(p => String(p.id) === id);
  document.getElementById("materialCostInput").value = product ? calculateLiveCost(product) : "";
  showQuoteResult(null);
  if (product) document.getElementById("calcProductName").textContent = product.name;
};

window.calculateCost = function () {
  const id = document.getElementById("calcProductSelect").value;
  const product = products.find(p => String(p.id) === id);
  const source = product && id ? { productId: product.id, name: product.name, type: product.type } : activeQuote;
  if (!source) {
    alert("제품을 선택하거나 저장한 견적을 불러오세요.");
    return null;
  }

  const values = {};
  for (const field of ["mfg", "pack", "logi", "margin"]) {
    const input = document.getElementById(field);
    values[field] = Number(input.value);
    if (!input.validity.valid || !Number.isFinite(values[field])) {
      alert("제조비, 포장비, 물류비, 가산율은 0 이상으로 입력하세요.");
      return null;
    }
  }

  const material = Number(document.getElementById("materialCostInput").value);
  const extra = values.mfg + values.pack + values.logi;
  const cost = material + extra;
  const unitCost = Math.round(cost * (1 + values.margin / 100) * 100) / 100;
  if (!Number.isFinite(unitCost)) {
    alert("견적 금액이 계산 가능한 범위를 초과했습니다.");
    return null;
  }

  const quote = { productId: source.productId, name: source.name, type: source.type,
    material, ...values, extra, cost, unitCost };
  showQuoteResult(quote);
  return quote;
};

function saveQuote() {
  const quote = calculateCost();
  if (!quote) return;
  quotes.unshift({ ...quote, id: Date.now(), date: new Date().toLocaleString("ko-KR") });
  saveAll();
  alert("견적이 저장되었습니다.");
}

function loadQuote(id) {
  const quote = quotes.find(item => String(item.id) === String(id));
  if (!quote) return;

  showPage("calc");
  activeQuote = quote;
  document.getElementById("calcProductSelect").value = String(
    quote.productId ?? products.find(p => p.name === quote.name)?.id ?? ""
  );
  for (const field of ["mfg", "pack", "logi", "margin"]) {
    document.getElementById(field).value = quote[field] ?? 0;
  }
  document.getElementById("materialCostInput").value = quote.material ?? quote.cost ?? 0;
  showQuoteResult({ ...quote, material: quote.material ?? quote.cost ?? 0,
    cost: Number(quote.cost) || 0, extra: quote.extra ?? 0 });
}

// =============================
// 선택 기능 (견적 조회)
// =============================

function toggleAll(el) {
 document.querySelectorAll("#quoteList .rowCheck").forEach(cb => {
    cb.checked = el.checked;
  });
}

function deleteSelected() {
  const checked = Array.from(document.querySelectorAll("#quoteList .rowCheck:checked"))
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
  const checked = Array.from(document.querySelectorAll("#recipeProductList .rowCheck:checked"))
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
  const checked = document.querySelector("#quoteList .rowCheck:checked");

  if (!checked) {
    alert("하나 선택하세요.");
    return;
  }

  loadQuote(checked.value);
}
function loadQuotes() {
  const list = document.getElementById("quoteList");
  list.innerHTML = "";

  document.getElementById("selectAll").checked = false;
  const keyword = document.getElementById("quoteSearch").value.trim().toLowerCase();
  const filtered = quotes.filter(q => [q.name, q.type].some(value =>
    String(value ?? "").toLowerCase().includes(keyword)
  ));
  if (!filtered.length) {
    list.innerHTML = `<tr><td colspan="7">데이터 없음</td></tr>`;
    return;
  }

  filtered.forEach((q) => {
    list.innerHTML += `
      <tr>
        <td><input type="checkbox" class="rowCheck" value="${q.id}"></td>
        <td>${escapeHtml(q.type || "")}</td>
        <td>${escapeHtml(q.name || "")}</td>
        <td>${formatNumber(q.cost)} 원</td>
        <td>${formatNumber(q.unitCost)} 원</td>
        <td>${escapeHtml(q.date || "")}</td>
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
let subPriceHistory = JSON.parse(localStorage.getItem("subPriceHistory")) ??
  subMaterials.map(item => ({ ...item }));
let editingSubMaterialId = null;

// =============================
// 저장 확장
// =============================
const originalSaveAll = saveAll;
saveAll = function () {
  originalSaveAll();
  localStorage.setItem("subMaterials", JSON.stringify(subMaterials));
  localStorage.setItem("subPriceHistory", JSON.stringify(subPriceHistory));
  localStorage.setItem("priceHistory", JSON.stringify(priceHistory)); 
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
  editingSubMaterialId = null;
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
  const priceText = document.getElementById("subMaterialPrice").value;
  const price = Number(priceText);
  const date = normalizeDate(document.getElementById("subMaterialDate").value);

  if (!code || !name || !date || !priceText || !Number.isFinite(price) || price < 0) {
    alert("모든 항목을 입력하고 단가는 0 이상으로 입력하세요.");
    return;
  }
  const target = subMaterials.find(item => item.id === editingSubMaterialId);
  if (editingSubMaterialId !== null && !target) {
    alert("수정할 부재료가 목록에 없습니다.");
    return;
  }

  const sameCode = subMaterials.some(item => String(item.code) === code &&
    String(item.code) !== String(target?.code));
  const sameName = subMaterials.some(item => item.name.trim().toLowerCase() === name.toLowerCase() &&
    String(item.code) !== String(target?.code));
  if (sameCode || sameName) {
    alert("같은 코드 또는 부재료명이 이미 존재합니다.");
    return;
  }

  const entry = { id: target?.id ?? Date.now(), code, name, price, date };
  if (target) subMaterials = subMaterials.filter(item => String(item.code) !== String(target.code));
  subMaterials.push(entry);
  subPriceHistory.push({ ...entry, id: Date.now() + Math.random() });
  saveAll();
  clearSubMaterialInputs();
  loadSubMaterials();
  loadSubPriceHistory("");
}

// =============================
// 목록
// =============================
function getAllLatestSubMaterials() {
  const map = Object.create(null);

  subMaterials.forEach((m) => {
    const key = String(m.code);

    if (!map[key] || (new Date(m.date) - new Date(map[key].date) || Number(m.id) - Number(map[key].id)) > 0) {
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
        <td>${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.name)}</td>
        <td>${formatNumber(m.price)} 원</td>
        <td>${escapeHtml(m.date)}</td>
        <td><button onclick="editSubMaterial('${escapeHtml(escapeJsString(m.code))}')">수정</button></td>
        <td><button onclick="deleteSubMaterial('${escapeHtml(escapeJsString(m.code))}')">삭제</button></td>
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
  const material = getAllLatestSubMaterials().find(m => String(m.code) === String(code));
  if (!material) return;

  document.getElementById("subMaterialCode").value = material.code;
  document.getElementById("subMaterialName").value = material.name;
  document.getElementById("subMaterialPrice").value = material.price;
  document.getElementById("subMaterialDate").value = material.date;

  editingSubMaterialId = material.id;
}

// =============================
// 히스토리
// =============================
function loadSubPriceHistory(keyword = "") {
  const table = document.getElementById("subPriceHistoryTable");
  table.innerHTML = "";

  const filtered = subPriceHistory.filter(m =>
    m.name.toLowerCase().includes(keyword.toLowerCase()) ||
    String(m.code).includes(keyword)
  );

  filtered.forEach((m) => {
    table.innerHTML += `
      <tr>
        <td>${escapeHtml(m.code)}</td>
        <td>${escapeHtml(m.name)}</td>
       <td>${formatNumber(m.price)} 원</td>
        <td>${escapeHtml(m.date)}</td>
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
  subPriceHistory = subPriceHistory.filter((m) => m.id !== id);
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
  if (typeof XLSX === "undefined") {
    alert("엑셀 업로드 라이브러리를 불러오지 못했습니다. 연결을 확인한 뒤 새로고침하세요.");
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

      const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

      if (!code || !name) return;

      const entry = {
        id: Date.now() + Math.random(),
        code,
        name,
        price,
        date
      };
      subMaterials.push(entry);
      subPriceHistory.push({ ...entry });
    });

    saveAll();
    loadSubMaterials();
    loadSubPriceHistory("");

    fileInput.value = "";
    alert("부재료 엑셀 업로드 완료");
  };

  reader.readAsArrayBuffer(file);
}
function login() {
  const id = document.getElementById("loginId").value;
  const pw = document.getElementById("loginPw").value;

  if (id === "rnd" && pw === "1q2q3q4q@") {
    sessionStorage.setItem("isLogin", "true");

    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainPage").style.display = "block";

    showPage("db");
    startIdleTimer();
  } else {
    alert("아이디 또는 비밀번호 오류");
  }
}

// 20260331 자동 로그인 삭제
window.addEventListener("DOMContentLoaded", () => {
  bindActivityEvents();

  if (isLoggedIn()) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("mainPage").style.display = "block";
    showPage("db");
    startIdleTimer();
  } else {
    document.getElementById("loginPage").style.display = "flex";
    document.getElementById("mainPage").style.display = "none";
  }
});
