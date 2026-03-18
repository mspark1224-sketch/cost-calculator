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
      <td>${p.name || ""}</td>
      <td>${p.date ? new Date(p.date).toLocaleString() : ""}</td>
      <td>
        <button type="button" onclick="loadProductToRecipe('${p.id}')">불러오기</button>
        <button type="button" onclick="deleteProduct('${p.id}')">삭제</button>
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
  const volume = parseFloat(document.getElementById("productVolume")?.value) || 0;
  const density = parseFloat(document.getElementById("productDensity")?.value) || 1;
  const unit = document.getElementById("productUnit")?.value;

  // 🔥 이미 계산된 (원/kg 합계) 가져오기
  const costText = document.getElementById("costSum")?.innerText || "0";
  const totalCostPerKg = parseFloat(costText.replace(/[^\d.]/g, "")) || 0;

  // 🔥 g → kg 변환
  let volumeKg = volume;
  if (unit === "g") volumeKg = volume / 1000;

  // 🔥 최종 계산
  const unitCost = totalCostPerKg * volumeKg * density;

  document.getElementById("recipeUnitCost").value = unitCost.toFixed(2);

  console.log("단위원가:", unitCost);
};
window.saveRecipe = function () {
  const name = prompt("제품명을 입력하세요");
  if (!name) return;

  const rows = document.querySelectorAll("#recipeTableBody tr");

  const recipe = [];

  rows.forEach((row) => {
    const matName = row.querySelector(".mat-name")?.value || "";
    const ratio = parseFloat(row.querySelector(".mat-ratio")?.value) || 0;
    const cost = parseFloat(row.querySelector(".mat-cost")?.value) || 0;

    if (matName && ratio > 0) {
      recipe.push({
        name: matName,
        ratio,
        cost
      });
    }
  });

  const newProduct = {
    id: Date.now(),
    name,
    date: new Date().toISOString(),
    recipe
  };

  products.push(newProduct);
  saveAll();

  alert("제품 저장 완료");

  if (typeof window.loadProducts === "function") {
    window.loadProducts();
  }
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
    `<option value="${m.code}">${m.name}</option>`
  ).join("");

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select onchange="updateRecipeRow(this)">
        <option value="">선택</option>
        ${options}
      </select>
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
function updateRecipeRow(select) {
  const code = select.value;
  const row = select.closest("tr");

  if (!code) return;

  const material = getLatestRecordByCode(code);

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
    const price = Number(row.querySelector(".price").innerText || 0);
    const ratio = Number(row.querySelector("input").value || 0);

    const cost = price * (ratio / 100);

    row.querySelector(".cost").innerText = Math.round(cost);

totalRatio += parseFloat(ratio) || 0;
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
