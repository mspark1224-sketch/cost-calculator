let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];

let editMaterialCode = null;
let selectedHistoryCode = null;

function saveAll() {
  localStorage.setItem("materials", JSON.stringify(materials));
  localStorage.setItem("quotes", JSON.stringify(quotes));
  localStorage.setItem("products", JSON.stringify(products));
}

function showPage(id) {
  document.querySelectorAll(".page").forEach((p) => {
    p.style.display = "none";
  });

  document.getElementById(id).style.display = "block";

  if (id === "db") {
    loadMaterials();
    loadPriceHistory(selectedHistoryCode);
  }
  if (id === "recipe") {
    loadProducts();
    updateRatioTotal();
    refreshRecipePrices();
  }
  if (id === "history") loadQuotes();
}

function formatNumber(num) {
  return Number(num || 0).toLocaleString("ko-KR");
}

function clearMaterialInputs() {
  document.getElementById("materialCode").value = "";
  document.getElementById("materialName").value = "";
  document.getElementById("materialPrice").value = "";
  document.getElementById("materialDate").value = "";
  editMaterialCode = null;
}

function normalizeDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toISOString().slice(0, 10);
}

function getLatestRecordByCode(code) {
  const rows = materials.filter((m) => m.code === code);
  if (rows.length === 0) return null;

  rows.sort((a, b) => {
    const ad = new Date(a.date || "1900-01-01").getTime();
    const bd = new Date(b.date || "1900-01-01").getTime();
    return bd - ad;
  });

  return rows[0];
}

function getAllLatestMaterials() {
  const codeMap = {};

  materials.forEach((row) => {
    const latest = codeMap[row.code];
    if (!latest) {
      codeMap[row.code] = row;
      return;
    }

    const latestTime = new Date(latest.date || "1900-01-01").getTime();
    const rowTime = new Date(row.date || "1900-01-01").getTime();

    if (rowTime > latestTime) {
      codeMap[row.code] = row;
    }
  });

  return Object.values(codeMap).sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

function getLatestPriceByCode(code) {
  const latest = getLatestRecordByCode(code);
  return latest ? Number(latest.price || 0) : 0;
}

function getLatestNameByCode(code) {
  const latest = getLatestRecordByCode(code);
  return latest ? latest.name : "";
}

function saveMaterial() {
  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const price = document.getElementById("materialPrice").value;
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (code === "" || name === "" || price === "" || date === "") {
    alert("코드 / 이름 / 단가 / 적용일을 입력하세요.");
    return;
  }

  const existsSameDate = materials.find(
    (m) => m.code === code && normalizeDate(m.date) === date
  );

  if (existsSameDate) {
    const ok = confirm("같은 코드와 적용일 데이터가 있습니다. 덮어쓸까요?");
    if (!ok) return;

    existsSameDate.name = name;
    existsSameDate.price = Number(price);
  } else {
    materials.push({
      id: Date.now() + Math.random(),
      code,
      name,
      price: Number(price),
      date
    });
  }

  saveAll();
  selectedHistoryCode = code;
  clearMaterialInputs();
  loadMaterials();
  loadPriceHistory(code);
  refreshRecipeMaterialOptions();
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

function updateMaterial() {
  if (!editMaterialCode) {
    alert("수정할 원재료의 수정 버튼을 먼저 누르세요.");
    return;
  }

  const code = document.getElementById("materialCode").value.trim();
  const name = document.getElementById("materialName").value.trim();
  const price = document.getElementById("materialPrice").value;
  const date = normalizeDate(document.getElementById("materialDate").value);

  if (code === "" || name === "" || price === "" || date === "") {
    alert("코드 / 이름 / 단가 / 적용일을 입력하세요.");
    return;
  }

  const target = materials.find(
    (m) => m.code === editMaterialCode && normalizeDate(m.date) === date
  );

  if (target) {
    target.code = code;
    target.name = name;
    target.price = Number(price);
    target.date = date;
  } else {
    const latest = getLatestRecordByCode(editMaterialCode);
    if (!latest) {
      alert("수정할 원재료를 찾을 수 없습니다.");
      return;
    }

    latest.code = code;
    latest.name = name;
    latest.price = Number(price);
    latest.date = date;
  }

  products.forEach((product) => {
    product.recipe.forEach((item) => {
      if (item.materialCode === editMaterialCode) {
        item.materialCode = code;
      }
    });
  });

  editMaterialCode = code;
  selectedHistoryCode = code;

  saveAll();
  loadMaterials();
  loadPriceHistory(code);
  refreshRecipeMaterialOptions();
  alert("수정되었습니다.");
}

function deleteMaterial(code) {
  const hasRecipe = products.some((p) =>
    p.recipe.some((r) => r.materialCode === code)
  );

  if (hasRecipe) {
    alert("이 원재료 코드는 제품 배합표에서 사용 중이라 삭제할 수 없습니다.");
    return;
  }

  const latest = getLatestRecordByCode(code);
  const nameText = latest ? latest.name : code;

  const ok = confirm(`${nameText} (${code})의 전체 가격 히스토리를 삭제할까요?`);
  if (!ok) return;

  materials = materials.filter((m) => m.code !== code);

  if (selectedHistoryCode === code) selectedHistoryCode = null;
  if (editMaterialCode === code) clearMaterialInputs();

  saveAll();
  loadMaterials();
  loadPriceHistory(selectedHistoryCode);
  refreshRecipeMaterialOptions();
}

function loadMaterials() {
  const list = document.getElementById("materialList");
  const keyword = (document.getElementById("materialSearch")?.value || "").trim().toLowerCase();

  list.innerHTML = "";

  const latestMaterials = getAllLatestMaterials().filter(
    (m) =>
      m.name.toLowerCase().includes(keyword) ||
      String(m.code).toLowerCase().includes(keyword)
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
      <td>${m.code}</td>
      <td>${m.name}</td>
      <td>${formatNumber(m.price)} 원</td>
      <td>${normalizeDate(m.date)}</td>
      <td><button onclick="editMaterial('${String(m.code).replace(/'/g, "\\'")}')">수정</button></td>
      <td><button class="danger" onclick="deleteMaterial('${String(m.code).replace(/'/g, "\\'")}')">삭제</button></td>
    `;
    list.appendChild(tr);
  });
}

function loadPriceHistory(code) {
  const title = document.getElementById("historyTitle");
  const list = document.getElementById("priceHistoryList");

  if (!list || !title) return;

  list.innerHTML = "";

  if (!code) {
    title.innerText = "원재료를 선택하면 이력이 표시됩니다.";
    list.innerHTML = `<tr><td colspan="5" class="empty">선택된 원재료가 없습니다.</td></tr>`;
    return;
  }

  const rows = materials
    .filter((m) => m.code === code)
    .sort((a, b) => new Date(b.date || "1900-01-01") - new Date(a.date || "1900-01-01"));

  if (rows.length === 0) {
    title.innerText = "이력이 없습니다.";
    list.innerHTML = `<tr><td colspan="5" class="empty">이력이 없습니다.</td></tr>`;
    return;
  }

  title.innerText = `${rows[0].name} (${rows[0].code}) 가격 이력`;

  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.code}</td>
      <td>${row.name}</td>
      <td>${formatNumber(row.price)} 원</td>
      <td>${normalizeDate(row.date)}</td>
    `;
    list.appendChild(tr);
  });
}

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
        const price = Number(row["단가"] || 0);
        const date = normalizeDate(String(row["적용일"] || "").trim());

        if (!code || !name || !price || !date) return;

        const existing = materials.find(
          (m) => m.code === code && normalizeDate(m.date) === date
        );

        if (existing) {
          existing.name = name;
          existing.price = price;
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

      saveAll();
      loadMaterials();
      loadPriceHistory(selectedHistoryCode);
      refreshRecipeMaterialOptions();

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

function getRecipeTbody() {
  return document.querySelector("#recipeTable tbody");
}

function resetRecipeTable() {
  const tbody = getRecipeTbody();
  tbody.innerHTML = "";
  document.getElementById("productName").value = "";
  updateRatioTotal();
}

function addRecipe(prefill = null) {
  const latestMaterials = getAllLatestMaterials();

  if (latestMaterials.length === 0) {
    alert("먼저 원재료 DB를 입력하세요.");
    return;
  }

  const tbody = getRecipeTbody();
  const tr = document.createElement("tr");

  const selectedCode = prefill?.materialCode || latestMaterials[0].code;
  const selectedRatio = prefill?.ratio ?? 0;

  let options = "";
  latestMaterials.forEach((m) => {
    options += `<option value="${m.code}" ${String(selectedCode) === String(m.code) ? "selected" : ""}>${m.name}</option>`;
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
      <button class="danger" onclick="deleteRecipeRow(this)">삭제</button>
    </td>
  `;

  tbody.appendChild(tr);
  onRecipeMaterialChange(tr.querySelector(".recipe-material"));
  updateRatioTotal();
}

function deleteRecipeRow(btn) {
  const row = btn.closest("tr");
  row.remove();
  updateRatioTotal();
}

function onRatioChange() {
  refreshRecipePrices();
  updateRatioTotal();
}

function onRecipeMaterialChange(selectEl) {
  const row = selectEl.closest("tr");
  const code = String(selectEl.value);
  const latest = getLatestRecordByCode(code);

  const codeCell = row.querySelector(".recipe-code");
  const priceCell = row.querySelector(".recipe-price");
  const ratioInput = row.querySelector(".recipe-ratio");
  const costCell = row.querySelector(".recipe-cost");

  const price = latest ? Number(latest.price) : 0;
  const ratio = Number(ratioInput.value || 0);
  const cost = price * (ratio / 100);

  codeCell.innerText = code;
  priceCell.innerText = `${formatNumber(price)} 원`;
  costCell.innerText = `${formatNumber(cost)} 원`;
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
      options += `<option value="${m.code}" ${current === String(m.code) ? "selected" : ""}>${m.name}</option>`;
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

  const ratioEl = document.getElementById("ratioTotal");
  if (ratioEl) ratioEl.innerText = total;
}

function getRecipeData() {
  const rows = Array.from(getRecipeTbody().querySelectorAll("tr"));

  return rows.map((row) => {
    const materialCode = String(row.querySelector(".recipe-material").value);
    const ratio = Number(row.querySelector(".recipe-ratio").value || 0);

    return {
      materialCode,
      ratio
    };
  });
}

function checkRatio() {
  const recipe = getRecipeData();
  const total = recipe.reduce((sum, item) => sum + Number(item.ratio || 0), 0);

  if (total !== 100) {
    alert(`배합비 합계가 100%가 아닙니다. 현재 합계: ${total}%`);
    return false;
  }

  return true;
}

function saveRecipe() {
  const name = document.getElementById("productName").value.trim();

  if (name === "") {
    alert("제품명을 입력하세요.");
    return;
  }

  const recipe = getRecipeData();

  if (recipe.length === 0) {
    alert("배합표를 먼저 작성하세요.");
    return;
  }

  if (!checkRatio()) return;

  const existing = products.find((p) => p.name === name);
  const newData = {
    id: existing ? existing.id : Date.now() + Math.random(),
    name,
    recipe,
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
  alert("제품이 저장되었습니다.");
}

function loadProducts() {
  const list = document.getElementById("productList");
  if (!list) return;

  const keyword = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();

  list.innerHTML = "";

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="4" class="empty">저장된 제품이 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.date}</td>
      <td><button onclick="loadProduct(${p.id})">불러오기</button></td>
      <td><button class="danger" onclick="deleteProduct(${p.id})">삭제</button></td>
    `;
    list.appendChild(tr);
  });
}

function loadProduct(id) {
  const product = products.find((p) => Number(p.id) === Number(id));
  if (!product) return;

  resetRecipeTable();
  document.getElementById("productName").value = product.name;

  product.recipe.forEach((item) => addRecipe(item));
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
}

function calculate() {
  const recipe = getRecipeData();

  if (recipe.length === 0) {
    alert("배합표를 먼저 작성하세요.");
    return;
  }

  const productName = document.getElementById("productName").value.trim() || "미지정 제품";

  let materialCost = 0;
  recipe.forEach((item) => {
    materialCost += getLatestPriceByCode(item.materialCode) * (Number(item.ratio) / 100);
  });

  const mfg = Number(document.getElementById("mfg").value || 0);
  const pack = Number(document.getElementById("pack").value || 0);
  const logi = Number(document.getElementById("logi").value || 0);
  const margin = Number(document.getElementById("margin").value || 0) / 100;

  const extraCost = mfg + pack + logi;
  const totalCost = materialCost + extraCost;
  const quote = totalCost * (1 + margin);

  document.getElementById("calcProductName").innerText = productName;
  document.getElementById("materialCostText").innerText = `${formatNumber(materialCost.toFixed(0))} 원`;
  document.getElementById("extraCostText").innerText = `${formatNumber(extraCost.toFixed(0))} 원`;
  document.getElementById("totalCostText").innerText = `${formatNumber(totalCost.toFixed(0))} 원`;
  document.getElementById("result").innerText = `${formatNumber(quote.toFixed(0))} 원`;

  window.currentQuote = {
    id: Date.now() + Math.random(),
    productName,
    quote: Number(quote.toFixed(0)),
    materialCost: Number(materialCost.toFixed(0)),
    extraCost: Number(extraCost.toFixed(0)),
    totalCost: Number(totalCost.toFixed(0)),
    date: new Date().toLocaleString()
  };
}

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

  const keyword = (document.getElementById("quoteSearch")?.value || "").trim().toLowerCase();

  list.innerHTML = "";

  const filtered = quotes.filter((q) =>
    q.productName.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="4" class="empty">저장된 견적이 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((q) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${q.productName}</td>
      <td>${formatNumber(q.quote)} 원</td>
      <td>${q.date}</td>
      <td><button class="danger" onclick="deleteQuote(${q.id})">삭제</button></td>
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

loadMaterials();
loadProducts();
loadQuotes();
loadPriceHistory(null);
