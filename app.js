let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];

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

  if (id === "db") loadMaterials();
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
  document.getElementById("materialName").value = "";
  document.getElementById("materialPrice").value = "";
}

function saveMaterial() {
  const name = document.getElementById("materialName").value.trim();
  const price = document.getElementById("materialPrice").value;

  if (name === "" || price === "") {
    alert("원재료 이름과 단가를 입력하세요.");
    return;
  }

  const exists = materials.find((m) => m.name === name);
  if (exists) {
    const ok = confirm("같은 이름의 원재료가 있습니다. 단가를 업데이트할까요?");
    if (!ok) return;
    exists.price = Number(price);
  } else {
    materials.push({
      id: Date.now() + Math.random(),
      name: name,
      price: Number(price)
    });
  }

  saveAll();
  clearMaterialInputs();
  loadMaterials();
  refreshRecipeMaterialOptions();
}

function loadMaterials() {
  const list = document.getElementById("materialList");
  const keyword = (document.getElementById("materialSearch")?.value || "").trim().toLowerCase();

  list.innerHTML = "";

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<tr><td colspan="4" class="empty">데이터가 없습니다.</td></tr>`;
    return;
  }

  filtered.forEach((m, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${m.name}</td>
      <td>${formatNumber(m.price)} 원</td>
      <td><button class="danger" onclick="deleteMaterial(${m.id})">삭제</button></td>
    `;
    list.appendChild(tr);
  });
}

function deleteMaterial(id) {
  const usedInRecipe = Array.from(document.querySelectorAll(".recipe-material")).some(
    (select) => Number(select.value) === id
  );

  if (usedInRecipe) {
    alert("현재 배합표에서 사용 중인 원재료입니다. 배합표에서 먼저 삭제해 주세요.");
    return;
  }

  const target = materials.find((m) => m.id === id);
  if (!target) return;

  const ok = confirm(`${target.name} 원재료를 삭제할까요?`);
  if (!ok) return;

  materials = materials.filter((m) => m.id !== id);
  saveAll();
  loadMaterials();
  refreshRecipeMaterialOptions();
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
  if (materials.length === 0) {
    alert("먼저 원재료 DB를 입력하세요.");
    return;
  }

  const tbody = getRecipeTbody();
  const tr = document.createElement("tr");

  const selectedMaterialId = prefill?.materialId || materials[0].id;
  const selectedRatio = prefill?.ratio ?? 0;

  let options = "";
  materials.forEach((m) => {
    options += `<option value="${m.id}" ${Number(selectedMaterialId) === Number(m.id) ? "selected" : ""}>${m.name}</option>`;
  });

  tr.innerHTML = `
    <td>
      <select class="recipe-material" onchange="onRecipeMaterialChange(this)">
        ${options}
      </select>
    </td>
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
  const materialId = Number(selectEl.value);
  const material = materials.find((m) => Number(m.id) === materialId);

  const priceCell = row.querySelector(".recipe-price");
  const ratioInput = row.querySelector(".recipe-ratio");
  const costCell = row.querySelector(".recipe-cost");

  const price = material ? Number(material.price) : 0;
  const ratio = Number(ratioInput.value || 0);
  const cost = price * (ratio / 100);

  priceCell.innerText = `${formatNumber(price)} 원`;
  costCell.innerText = `${formatNumber(cost)} 원`;
}

function refreshRecipePrices() {
  document.querySelectorAll(".recipe-material").forEach((selectEl) => {
    onRecipeMaterialChange(selectEl);
  });
}

function refreshRecipeMaterialOptions() {
  document.querySelectorAll(".recipe-material").forEach((selectEl) => {
    const current = Number(selectEl.value);
    let options = "";

    materials.forEach((m) => {
      options += `<option value="${m.id}" ${current === Number(m.id) ? "selected" : ""}>${m.name}</option>`;
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

  document.getElementById("ratioTotal").innerText = total;
}

function getRecipeData() {
  const rows = Array.from(getRecipeTbody().querySelectorAll("tr"));

  return rows.map((row) => {
    const materialId = Number(row.querySelector(".recipe-material").value);
    const ratio = Number(row.querySelector(".recipe-ratio").value || 0);
    const material = materials.find((m) => Number(m.id) === materialId);

    return {
      materialId: materialId,
      materialName: material ? material.name : "",
      materialPrice: material ? Number(material.price) : 0,
      ratio: ratio
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
    name: name,
    recipe: recipe,
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

  document.getElementById("productName").value = product.name;
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
    materialCost += Number(item.materialPrice) * (Number(item.ratio) / 100);
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

  quotes.push({
    id: Date.now() + Math.random(),
    productName: window.currentQuote.productName,
    quote: window.currentQuote.quote,
    materialCost: window.currentQuote.materialCost,
    extraCost: window.currentQuote.extraCost,
    totalCost: window.currentQuote.totalCost,
    date: window.currentQuote.date
  });

  saveAll();
  loadQuotes();
  alert("견적이 저장되었습니다.");
}

function loadQuotes() {
  const list = document.getElementById("quoteList");
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
