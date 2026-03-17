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
  if (dateValue === null || dateValue === undefined || dateValue === "") return "";

  // 숫자형 엑셀 serial date 대응
  if (typeof dateValue === "number" || (!isNaN(dateValue) && String(dateValue).trim() !== "")) {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + Number(dateValue) * 86400000);

    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  const text = String(dateValue).trim();
  const d = new Date(text);

  if (Number.isNaN(d.getTime())) return text;
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
// 원재료 입력 초기화
// =============================
function clearMaterialInputs() {
  const codeEl = document.getElementById("materialCode");
  const nameEl = document.getElementById("materialName");
  const priceEl = document.getElementById("materialPrice");
  const dateEl = document.getElementById("materialDate");

  if (codeEl) codeEl.value = "";
  if (nameEl) nameEl.value = "";
  if (priceEl) priceEl.value = "";
  if (dateEl) dateEl.value = "";

  editMaterialCode = null;
}

// =============================
// 원가 계산
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

  if (unit === "g") {
    weightKg = qty / 1000;
  } else if (unit === "ml") {
    weightKg = (qty * specGravity) / 1000;
  } else {
    return 0;
  }

  return Math.round(cost * weightKg);
}

// =============================
// 원재료 저장/수정/삭제
// =============================
function saveMaterial() {
  const code = document.getElementById("materialCode")?.value.trim();
  const name = document.getElementById("materialName")?.value.trim();
  const price = document.getElementById("materialPrice")?.value;
  const date = normalizeDate(document.getElementById("materialDate")?.value);

  if (code === "" || name === "" || price === "" || date === "") {
    alert("코드 / 이름 / 단가 / 적용일을 입력하세요.");
    return;
  }

  const existsSameDate = materials.find(
    (m) => String(m.code) === String(code) && normalizeDate(m.date) === date
  );

  if (existsSameDate) {
    const ok = confirm("같은 코드와 적용일 데이터가 있습니다. 덮어쓸까요?");
    if (!ok) return;

    existsSameDate.name = name;
    existsSameDate.price = Number(price);
    existsSameDate.date = date;
  } else {
    materials.push({
      id: Date.now() + Math.random(),
      code,
      name,
      price: Number(price),
      date
    });
  }

  // 제품 원가 재계산
  products.forEach((product) => {
    product.materialCost = calculateMaterialCost(product.recipe);
    product.unitCost = calculateUnitCostByProduct(
      product.materialCost,
      product.volume,
      product.unit,
      product.density
    );
  });

  saveAll();
  selectedHistoryCode = code;
  clearMaterialInputs();
  loadMaterials();
  loadPriceHistory(code);
  loadProducts();
  loadCalcProducts();
  refreshRecipeMaterialOptions();
  refreshRecipePrices();
}

function editMaterial(code) {
  const latest = getLatestRecordByCode(code);
  if (!latest) return;

  editMaterialCode = code;
  selectedHistoryCode = code;

  const codeEl = document.getElementById("materialCode");
  const nameEl = document.getElementById("materialName");
  const priceEl = document.getElementById("materialPrice");
  const dateEl = document.getElementById("materialDate");

  if (codeEl) codeEl.value = latest.code;
  if (nameEl) nameEl.value = latest.name;
  if (priceEl) priceEl.value = latest.price;
  if (dateEl) dateEl.value = normalizeDate(latest.date);

  loadPriceHistory(code);
}

function updateMaterial() {
  if (!editMaterialCode) {
    alert("수정할 원재료의 수정 버튼을 먼저 누르세요.");
    return;
  }

  const code = document.getElementById("materialCode")?.value.trim();
  const name = document.getElementById("materialName")?.value.trim();
  const price = document.getElementById("materialPrice")?.value;
  const date = normalizeDate(document.getElementById("materialDate")?.value);

  if (code === "" || name === "" || price === "" || date === "") {
    alert("코드 / 이름 / 단가 / 적용일을 입력하세요.");
    return;
  }

  const oldCode = String(editMaterialCode);

  const duplicate = materials.find(
    (m) =>
      String(m.code) === String(code) &&
      normalizeDate(m.date) === date &&
      !(
        String(m.code) === String(editMaterialCode) &&
        normalizeDate(m.date) === normalizeDate(document.getElementById("materialDate")?.value)
      )
  );

  if (duplicate && String(code) !== oldCode) {
    const ok = confirm("변경하려는 코드/적용일 조합이 이미 있습니다. 계속 진행할까요?");
    if (!ok) return;
  }

  const latest = getLatestRecordByCode(editMaterialCode);
  if (!latest) {
    alert("수정할 원재료를 찾을 수 없습니다.");
    return;
  }

  latest.code = code;
  latest.name = name;
  latest.price = Number(price);
  latest.date = date;

  // 제품 배합표의 materialCode 동기화
  products.forEach((product) => {
    product.recipe.forEach((item) => {
      if (String(item.materialCode) === oldCode) {
        item.materialCode = code;
      }
    });

    product.materialCost = calculateMaterialCost(product.recipe);
    product.unitCost = calculateUnitCostByProduct(
      product.materialCost,
      product.volume,
      product.unit,
      product.density
    );
  });

  editMaterialCode = code;
  selectedHistoryCode = code;

  saveAll();
  loadMaterials();
  loadPriceHistory(code);
  loadProducts();
  loadCalcProducts();
  refreshRecipeMaterialOptions();
  refreshRecipePrices();
  updateRatioTotal();

  alert("수정되었습니다.");
}

function deleteMaterial(code) {
  const hasRecipe = products.some((p) =>
    p.recipe.some((r) => String(r.materialCode) === String(code))
  );

  if (hasRecipe) {
    alert("이 원재료 코드는 제품 배합표에서 사용 중이라 삭제할 수 없습니다.");
    return;
  }

  const latest = getLatestRecordByCode(code);
  const nameText = latest ? latest.name : code;

  const ok = confirm(`${nameText} (${code})의 전체 가격 히스토리를 삭제할까요?`);
  if (!ok) return;

  materials = materials.filter((m) => String(m.code) !== String(code));

  if (selectedHistoryCode === code) selectedHistoryCode = null;
  if (editMaterialCode === code) clearMaterialInputs();

  saveAll();
  loadMaterials();
  loadPriceHistory(selectedHistoryCode || "");
  loadProducts();
  loadCalcProducts();
  refreshRecipeMaterialOptions();
  refreshRecipePrices();
  updateRatioTotal();
}

// =============================
// 원재료 목록/히스토리
// =============================
function loadMaterials() {
  const list = document.getElementById("materialList");
  if (!list) return;

  const keyword = (document.getElementById("materialSearch")?.value || "")
    .trim()
    .toLowerCase();

  list.innerHTML = "";

  const latestMaterials = getAllLatestMaterials().filter(
    (m) =>
      String(m.name || "").toLowerCase().includes(keyword) ||
      String(m.code || "").toLowerCase().includes(keyword)
  );

  if (latestMaterials.length === 0) {
    list.innerHTML = `<tr><td colspan="7" class="empty">데이터가 없습니다.</td></tr>`;
    return;
  }

  latestMaterials.forEach((m, index) => {
    const tr = document.createElement("tr");

    if (selectedHistoryCode === m.code) {
      tr.classList.add("selected-row");
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(m.code)}</td>
      <td>${escapeHtml(m.name)}</td>
      <td>${formatNumber(m.price)} 원</td>
      <td>${normalizeDate(m.date)}</td>
      <td><button onclick="editMaterial('${escapeJsString(m.code)}')">수정</button></td>
      <td><button class="danger" onclick="deleteMaterial('${escapeJsString(m.code)}')">삭제</button></td>
    `;
    list.appendChild(tr);
  });
}

function loadPriceHistory(keyword) {
  const table = document.getElementById("priceHistoryTable");
  if (!table) return;

  table.innerHTML = "";

  let list = [...materials];

  if (keyword && keyword.trim() !== "") {
    const k = keyword.toLowerCase();

    list = list.filter(
      (p) =>
        String(p.name || "").toLowerCase().includes(k) ||
        String(p.code || "").toLowerCase().includes(k)
    );
  }

  list.sort((a, b) => {
    const ad = new Date(normalizeDate(a.date) || "1900-01-01").getTime();
    const bd = new Date(normalizeDate(b.date) || "1900-01-01").getTime();
    return bd - ad;
  });

  if (list.length === 0) {
    table.innerHTML = `<tr><td colspan="4">검색 결과가 없습니다.</td></tr>`;
    return;
  }

  list.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(p.code || "")}</td>
      <td>${escapeHtml(p.name || "")}</td>
      <td>${formatNumber(p.price)} 원</td>
      <td>${normalizeDate(p.date)}</td>
    `;

    table.appendChild(tr);
  });
}

function searchPriceHistory() {
  const keyword = document.getElementById("priceSearch")?.value || "";
  loadPriceHistory(keyword);
}

// =============================
// 엑셀 업로드
// =============================
function handleExcelUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!rows.length) {
        alert("엑셀에 데이터가 없습니다.");
        return;
      }

      let inserted = 0;
      let updated = 0;

      rows.forEach((row) => {
        const code = String(row["코드"] || "").trim();
        const name = String(row["원재료명"] || "").trim();
        const rawPrice = row["단가"];
        const price = Number(rawPrice || 0);
        const date = normalizeDate(row["적용일"]);

        if (!code || !name || !date) return;
        if (Number.isNaN(price)) return;

        const existing = materials.find(
          (m) => String(m.code) === String(code) && normalizeDate(m.date) === date
        );

        if (existing) {
          existing.name = name;
          existing.price = price;
          existing.date = date;
          updated += 1;
        } else {
          materials.push({
            id: Date.now() + Math.random(),
            code,
            name,
            price,
            date
          });
          inserted += 1;
        }
      });

      products.forEach((product) => {
        product.materialCost = calculateMaterialCost(product.recipe);
        product.unitCost = calculateUnitCostByProduct(
          product.materialCost,
          product.volume,
          product.unit,
          product.density
        );
      });

      saveAll();
      loadMaterials();
      loadPriceHistory(selectedHistoryCode || "");
      loadProducts();
      loadCalcProducts();
      refreshRecipeMaterialOptions();
      refreshRecipePrices();
      updateRatioTotal();

      alert(`엑셀 업로드 완료\n신규 추가: ${inserted}건\n업데이트: ${updated}건`);
    } catch (err) {
      console.error(err);
      alert("엑셀 업로드 중 오류가 발생했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsArrayBuffer(file);
}
// =============================
// 배합표
// =============================
function getRecipeTbody() {
  return document.querySelector("#recipeTable tbody");
}

function resetRecipeTable() {
  const tbody = getRecipeTbody();
  if (tbody) tbody.innerHTML = "";

  // 🔹 제품 기본 정보
  const productName = document.getElementById("productName");
  const productType = document.getElementById("productType");

  if (productName) productName.value = "";
  if (productType) productType.value = "";

  // 🔹 좌측 입력 영역 (실제 저장용)
  const productVolume = document.getElementById("productVolume");
  const productUnit = document.getElementById("productUnit");
  const productDensity = document.getElementById("productDensity");
  const recipeUnitCost = document.getElementById("recipeUnitCost");

  if (productVolume) productVolume.value = "";
  if (productUnit) productUnit.value = "g";
  if (productDensity) productDensity.value = 1;
  if (recipeUnitCost) recipeUnitCost.value = 0;

  // 🔹 가운데 환산 박스 (preview용)
  const calcVolumePreview = document.getElementById("calcVolumePreview");
  const calcUnitPreview = document.getElementById("calcUnitPreview");
  const calcDensityPreview = document.getElementById("calcDensityPreview");
  const recipeUnitCostPreview = document.getElementById("recipeUnitCostPreview");

  if (calcVolumePreview) calcVolumePreview.value = "";
  if (calcUnitPreview) calcUnitPreview.value = "g";
  if (calcDensityPreview) calcDensityPreview.value = 1;
  if (recipeUnitCostPreview) recipeUnitCostPreview.value = 0;

  // 🔹 합계 초기화 (이거 중요!!)
  const ratioTotal = document.getElementById("ratioTotal");
  const materialCostSum = document.getElementById("materialCostSum");
  const ratioSum = document.getElementById("ratioSum");
  const costSum = document.getElementById("costSum");

  if (ratioTotal) ratioTotal.innerText = 0;
  if (materialCostSum) materialCostSum.innerText = 0;
  if (ratioSum) ratioSum.innerText = 0;
  if (costSum) costSum.innerText = "0 원";
}

function addRecipe(prefill = null) {
  const latestMaterials = getAllLatestMaterials();

  if (latestMaterials.length === 0) {
    alert("먼저 원재료 DB를 입력하세요.");
    return;
  }

  const tbody = getRecipeTbody();
  if (!tbody) return;

  const tr = document.createElement("tr");

  const selectedCode = prefill?.materialCode || latestMaterials[0].code;
  const selectedRatio = prefill?.ratio ?? 0;

  let options = "";
  latestMaterials.forEach((m) => {
    options += `<option value="${escapeHtml(m.code)}" ${
      String(selectedCode) === String(m.code) ? "selected" : ""
    }>${escapeHtml(m.name)}</option>`;
  });

  tr.innerHTML = `
    <td>
      <select class="recipe-material" onchange="onRecipeMaterialChange(this)">
        ${options}
      </select>
    </td>
    <td class="recipe-code"></td>
    <td class="recipe-price">0 원</td>
    <td>
      <input class="recipe-ratio" type="number" value="${selectedRatio}" min="0" oninput="onRatioChange()" />
    </td>
    <td class="recipe-cost">0 원</td>
    <td>
      <button type="button" class="danger" onclick="deleteRecipeRow(this)">삭제</button>
    </td>
  `;

  tbody.appendChild(tr);
  onRecipeMaterialChange(tr.querySelector(".recipe-material"));
  updateRatioTotal();
}

function deleteRecipeRow(btn) {
  const row = btn.closest("tr");
  if (row) row.remove();
  updateRatioTotal();
}

function onRatioChange() {
  refreshRecipePrices();
  updateRatioTotal();
}

function onRecipeMaterialChange(selectEl) {
  const row = selectEl.closest("tr");
  if (!row) return;

  const code = String(selectEl.value);
  const latest = getLatestRecordByCode(code);

  const codeCell = row.querySelector(".recipe-code");
  const priceCell = row.querySelector(".recipe-price");
  const ratioInput = row.querySelector(".recipe-ratio");
  const costCell = row.querySelector(".recipe-cost");

  const price = latest ? Number(latest.price) : 0;
  const ratio = Number(ratioInput.value || 0);
  const cost = price * (ratio / 100);

  if (codeCell) codeCell.innerText = code;
  if (priceCell) priceCell.innerText = `${formatNumber(price)} 원`;
  if (costCell) costCell.innerText = `${formatNumber(cost)} 원`;
}

function refreshRecipePrices() {
  document.querySelectorAll(".recipe-material").forEach((selectEl) => {
    onRecipeMaterialChange(selectEl);
  });
}

function refreshRecipeMaterialOptions() {
  const latestMaterials = getAllLatestMaterials();

  document.querySelectorAll(".recipe-material").forEach((selectEl) => {
    const current = String(selectEl.value);
    let options = "";

    latestMaterials.forEach((m) => {
      options += `<option value="${escapeHtml(m.code)}" ${
        current === String(m.code) ? "selected" : ""
      }>${escapeHtml(m.name)}</option>`;
    });

    selectEl.innerHTML = options;
  });

  refreshRecipePrices();
}

function updateRatioTotal() {
  const ratios = document.querySelectorAll(".recipe-ratio");

  let total = 0;
  ratios.forEach((input) => {
    total += Number(input.value || 0);
  });

  const recipe = getRecipeData();
  const costSum = calculateMaterialCost(recipe);

  const ratioTotalEl = document.getElementById("ratioTotal");
  const materialCostSumEl = document.getElementById("materialCostSum");
  const ratioSumEl = document.getElementById("ratioSum");
  const costSumEl = document.getElementById("costSum");

  if (ratioTotalEl) ratioTotalEl.innerText = total;
  if (materialCostSumEl) materialCostSumEl.innerText = formatNumber(costSum);
  if (ratioSumEl) ratioSumEl.innerText = total;
  if (costSumEl) costSumEl.innerText = `${formatNumber(costSum)} 원`;

  updateUnitCost();
}

function getRecipeData() {
  const tbody = getRecipeTbody();
  if (!tbody) return [];

  const rows = Array.from(tbody.querySelectorAll("tr"));

  return rows.map((row) => {
    const materialCode = row.querySelector(".recipe-material")?.value || "";
    const ratio = Number(row.querySelector(".recipe-ratio")?.value || 0);

    return {
      materialCode,
      ratio
    };
  });
}

function checkRatio(recipe) {
  const total = recipe.reduce((sum, item) => sum + Number(item.ratio || 0), 0);

  if (Math.abs(total - 100) > 0.001) {
    alert(`배합비 합계가 100%가 아닙니다. 현재 합계: ${total}%`);
    return false;
  }

  return true;
}

function updateUnitCost() {
  const recipe = getRecipeData();
  const totalCost = calculateMaterialCost(recipe);

  const volume = Number(document.getElementById("productVolume")?.value || 0);
  const density = Number(document.getElementById("productDensity")?.value || 1);
  const unit = document.getElementById("productUnit")?.value;

  const unitCost = calculateUnitCostByProduct(
    totalCost,
    volume,
    unit,
    density
  );

  const unitCostEl = document.getElementById("recipeUnitCost");
  if (unitCostEl) unitCostEl.value = unitCost;
}

// =============================
// 제품 저장/목록/불러오기
// =============================
function saveRecipe() {
  const name = document.getElementById("productName")?.value.trim();
  const type = document.getElementById("productType")?.value || "";
  const volume = Number(document.getElementById("productVolume")?.value || 0);
  const unit = document.getElementById("productUnit")?.value || "g";
  const density = Number(document.getElementById("productDensity")?.value || 1);

  if (name === "") {
    alert("제품명을 입력하세요.");
    return;
  }

  const recipe = getRecipeData();

  if (recipe.length === 0) {
    alert("배합표를 먼저 작성하세요.");
    return;
  }

  if (!checkRatio(recipe)) return;

  const materialCost = calculateMaterialCost(recipe);
  const unitCost = calculateUnitCostByProduct(materialCost, volume, unit, density);

  const existing = products.find((p) => p.name === name);

  const newData = {
    id: existing ? existing.id : Date.now() + Math.random(),
    name,
    type,
    volume,
    unit,
    density,
    recipe,
    materialCost,
    unitCost,
    date: new Date().toLocaleString()
  };

  if (existing) {
    const ok = confirm("같은 제품명이 있습니다. 덮어쓸까요?");
    if (!ok) return;

    products = products.map((p) => (p.name === name ? newData : p));
  } else {
    products.push(newData);
  }

  saveAll();
  loadProducts();
  loadCalcProducts();
  updateUnitCost();

  alert("제품이 저장되었습니다.");
}

function loadProducts() {
  const list = document.getElementById("productList");
  if (!list) return;

  const keyword = (document.getElementById("productSearch")?.value || "")
    .trim()
    .toLowerCase();

  list.innerHTML = "";

  const filtered = products.filter((p) =>
    String(p.name || "").toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    list.innerHTML =
      `<tr><td colspan="4" class="empty">저장된 제품이 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${formatNumber(p.unitCost || 0)} 원</td>
      <td>${escapeHtml(p.date || "")}</td>
      <td>
        <button onclick="loadProduct(${Number(p.id)})">불러오기</button>
        <button class="danger" onclick="deleteProduct(${Number(p.id)})">삭제</button>
      </td>
    `;

    list.appendChild(tr);
  });
}

function loadProduct(id) {
  const product = products.find((p) => Number(p.id) === Number(id));
  if (!product) return;

  resetRecipeTable();

  const nameEl = document.getElementById("productName");
  const typeEl = document.getElementById("productType");
  const volumeEl = document.getElementById("productVolume");
  const unitEl = document.getElementById("productUnit");
  const densityEl = document.getElementById("productDensity");

  if (nameEl) nameEl.value = product.name;
  if (typeEl) typeEl.value = product.type || "";
  if (volumeEl) volumeEl.value = product.volume || "";
  if (unitEl) unitEl.value = product.unit || "g";
  if (densityEl) densityEl.value = product.density ?? "";

  product.recipe.forEach((item) => {
    addRecipe(item);
  });

  updateRatioTotal();
  showPage("recipe");
}

function deleteProduct(id) {
  const target = products.find((p) => Number(p.id) === Number(id));
  if (!target) return;

  const ok = confirm(`${target.name} 제품을 삭제할까요?`);
  if (!ok) return;

  products = products.filter((p) => Number(p.id) !== Number(id));

  saveAll();
  loadProducts();
  loadCalcProducts();
}

// =============================
// 원가 계산 페이지
// =============================
function loadCalcProducts() {
  const select = document.getElementById("calcProductSelect");
  if (!select) return;

  select.innerHTML = '<option value="">제품 선택</option>';

  products.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.name;   // ⭐ 변경 (id → name)
    option.textContent = p.name;
    select.appendChild(option);
  });
}

function loadMaterialCostFromProduct() {
  const select = document.getElementById("calcProductSelect");
  const selectedName = select?.value;

  const materialCostInput = document.getElementById("materialCostInput");
  const calcProductName = document.getElementById("calcProductName");
  const calcUnitCost = document.getElementById("calcUnitCost");

  if (!selectedName) {
    materialCostInput.value = 0;
    calcProductName.innerText = "-";
    calcUnitCost.value = 0;
    return;
  }

  const product = products.find((p) => p.name === selectedName);  // ⭐ 변경

  if (!product) return;

  calcProductName.innerText = product.name;

  const materialCost = Number(product.materialCost || 0);
  materialCostInput.value = materialCost;

  const unitCost = calculateUnitCostByProduct(
    materialCost,
    product.volume,
    product.unit,
    product.density
  );

  calcUnitCost.value = unitCost;
}
function calculate() {
  const productId = document.getElementById("calcProductSelect")?.value;
  const product = products.find((p) => String(p.id) === String(productId));

  if (!product) {
    alert("제품을 선택하세요");
    return;
  }

  const materialCost = Number(document.getElementById("materialCostInput")?.value || 0);
  const mfg = Number(document.getElementById("mfg")?.value || 0);
  const pack = Number(document.getElementById("pack")?.value || 0);
  const logi = Number(document.getElementById("logi")?.value || 0);
  const margin = Number(document.getElementById("margin")?.value || 0) / 100;

  const extraCost = mfg + pack + logi;
  const totalCost = materialCost + extraCost;
  const quote = Math.round(totalCost * (1 + margin));

  const materialCostText = document.getElementById("materialCostText");
  const extraCostText = document.getElementById("extraCostText");
  const totalCostText = document.getElementById("totalCostText");
  const result = document.getElementById("result");

  if (materialCostText) materialCostText.innerText = `${formatNumber(materialCost)} 원`;
  if (extraCostText) extraCostText.innerText = `${formatNumber(extraCost)} 원`;
  if (totalCostText) totalCostText.innerText = `${formatNumber(totalCost)} 원`;
  if (result) result.innerText = `${formatNumber(quote)} 원`;

  window.currentQuote = {
    id: Date.now(),
    productName: product.name,
    quote,
    date: new Date().toLocaleString()
  };
}

// =============================
// 견적 저장/조회
// =============================
function saveQuote() {
  if (!window.currentQuote) {
    alert("먼저 계산하세요.");
    return;
  }

  quotes.push({ ...window.currentQuote });

  saveAll();
  loadQuotes();

  alert("견적이 저장되었습니다.");
}

function loadQuotes() {
  const list = document.getElementById("quoteList");
  if (!list) return;

  const keyword = (document.getElementById("quoteSearch")?.value || "")
    .trim()
    .toLowerCase();

  list.innerHTML = "";

  const filtered = quotes.filter((q) =>
    String(q.productName || "").toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    list.innerHTML =
      `<tr><td colspan="4" class="empty">저장된 견적이 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((q) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(q.productName)}</td>
      <td>${formatNumber(q.quote)} 원</td>
      <td>${escapeHtml(q.date || "")}</td>
      <td><button class="danger" onclick="deleteQuote(${Number(q.id)})">삭제</button></td>
    `;

    list.appendChild(tr);
  });
}

function deleteQuote(id) {
  const ok = confirm("이 견적을 삭제할까요?");
  if (!ok) return;

  quotes = quotes.filter((q) => Number(q.id) !== Number(id));

  saveAll();
  loadQuotes();
}

// =============================
// 초기 실행
// =============================
loadMaterials();
loadProducts();
loadQuotes();
loadPriceHistory(null);
loadCalcProducts();
refreshRecipeMaterialOptions();
refreshRecipePrices();
updateRatioTotal();

function syncAndCalculateUnitCost() {
  const volumePreview = document.getElementById("calcVolumePreview");
  const unitPreview = document.getElementById("calcUnitPreview");
  const densityPreview = document.getElementById("calcDensityPreview");

  const volume = document.getElementById("productVolume");
  const unit = document.getElementById("productUnit");
  const density = document.getElementById("productDensity");

  if (volumePreview && volume) volume.value = volumePreview.value;
  if (unitPreview && unit) unit.value = unitPreview.value;
  if (densityPreview && density) density.value = densityPreview.value;

  calculateUnitCost();

  const result = document.getElementById("recipeUnitCost");
  const resultPreview = document.getElementById("recipeUnitCostPreview");

  if (result && resultPreview) {
    resultPreview.value = result.value || 0;
  }
}
