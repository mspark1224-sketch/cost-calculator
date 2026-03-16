let materials = JSON.parse(localStorage.getItem("materials")) || [];
let quotes = JSON.parse(localStorage.getItem("quotes")) || [];
let products = JSON.parse(localStorage.getItem("products")) || [];

let editMaterialId = null;

function saveAll() {
  localStorage.setItem("materials", JSON.stringify(materials));
  localStorage.setItem("quotes", JSON.stringify(quotes));
  localStorage.setItem("products", JSON.stringify(products));
}

function formatNumber(num){
  return Number(num || 0).toLocaleString("ko-KR")
}

function showPage(id){

  document.querySelectorAll(".page").forEach(p=>{
    p.style.display="none"
  })

  document.getElementById(id).style.display="block"

  if(id==="db") loadMaterials()
  if(id==="recipe"){
    loadProducts()
    updateRatioTotal()
    refreshRecipePrices()
  }

  if(id==="history") loadQuotes()

}

function clearMaterialInputs(){

  document.getElementById("materialCode").value=""
  document.getElementById("materialName").value=""
  document.getElementById("materialPrice").value=""
  document.getElementById("materialDate").value=""

  editMaterialId=null

}

function saveMaterial(){

  const code=document.getElementById("materialCode").value.trim()
  const name=document.getElementById("materialName").value.trim()
  const price=document.getElementById("materialPrice").value
  const date=document.getElementById("materialDate").value

  if(code=="" || name=="" || price==""){
    alert("코드 / 이름 / 단가 입력하세요")
    return
  }

  if(editMaterialId){

    let m=materials.find(x=>x.id===editMaterialId)

    m.code=code
    m.name=name
    m.price=Number(price)
    m.date=date

  }else{

    materials.push({
      id:Date.now(),
      code:code,
      name:name,
      price:Number(price),
      date:date
    })

  }

  saveAll()
  clearMaterialInputs()
  loadMaterials()
  refreshRecipeMaterialOptions()

}

function selectMaterial(id){

  const m=materials.find(x=>x.id===id)

  editMaterialId=id

  document.getElementById("materialCode").value=m.code
  document.getElementById("materialName").value=m.name
  document.getElementById("materialPrice").value=m.price
  document.getElementById("materialDate").value=m.date

}

function loadMaterials(){

  const list=document.getElementById("materialList")

  const keyword=(document.getElementById("materialSearch")?.value || "").toLowerCase()

  list.innerHTML=""

  const filtered=materials.filter(m=>
      m.name.toLowerCase().includes(keyword) ||
      m.code.toLowerCase().includes(keyword)
  )

  if(filtered.length===0){

    list.innerHTML=`<tr><td colspan="6">데이터 없음</td></tr>`
    return

  }

  filtered.forEach((m,index)=>{

    const tr=document.createElement("tr")

    tr.onclick=()=>selectMaterial(m.id)

    tr.innerHTML=`

      <td>${index+1}</td>
      <td>${m.code}</td>
      <td>${m.name}</td>
      <td>${formatNumber(m.price)} 원</td>
      <td>${m.date || ""}</td>

      <td>
      <button class="danger"
      onclick="deleteMaterial(${m.id});event.stopPropagation();">
      삭제
      </button>
      </td>

    `

    list.appendChild(tr)

  })

}

function deleteMaterial(id){

  if(!confirm("삭제하시겠습니까?")) return

  materials=materials.filter(m=>m.id!==id)

  saveAll()
  loadMaterials()
  refreshRecipeMaterialOptions()

}

function getRecipeTbody(){
  return document.querySelector("#recipeTable tbody")
}

function resetRecipeTable(){

  const tbody=getRecipeTbody()

  tbody.innerHTML=""

  document.getElementById("productName").value=""

  updateRatioTotal()

}

function addRecipe(prefill=null){

  if(materials.length===0){
    alert("원재료 DB 먼저 입력")
    return
  }

  const tbody=getRecipeTbody()

  const tr=document.createElement("tr")

  const selectedMaterialId=prefill?.materialId || materials[0].id
  const selectedRatio=prefill?.ratio ?? 0

  let options=""

  materials.forEach(m=>{
    options+=`<option value="${m.id}"
    ${Number(selectedMaterialId)===Number(m.id)?"selected":""}>
    ${m.name}
    </option>`
  })

  tr.innerHTML=`

  <td>
  <select class="recipe-material"
  onchange="onRecipeMaterialChange(this)">
  ${options}
  </select>
  </td>

  <td class="recipe-price">0 원</td>

  <td>
  <input class="recipe-ratio"
  type="number"
  value="${selectedRatio}"
  min="0"
  oninput="onRatioChange()">
  </td>

  <td class="recipe-cost">0 원</td>

  <td>
  <button class="danger"
  onclick="deleteRecipeRow(this)">
  삭제
  </button>
  </td>

  `

  tbody.appendChild(tr)

  onRecipeMaterialChange(tr.querySelector(".recipe-material"))

  updateRatioTotal()

}

function deleteRecipeRow(btn){

  const row=btn.closest("tr")

  row.remove()

  updateRatioTotal()

}

function onRatioChange(){

  refreshRecipePrices()

  updateRatioTotal()

}

function onRecipeMaterialChange(selectEl){

  const row=selectEl.closest("tr")

  const materialId=Number(selectEl.value)

  const material=materials.find(m=>Number(m.id)===materialId)

  const priceCell=row.querySelector(".recipe-price")
  const ratioInput=row.querySelector(".recipe-ratio")
  const costCell=row.querySelector(".recipe-cost")

  const price=material?Number(material.price):0
  const ratio=Number(ratioInput.value||0)

  const cost=price*(ratio/100)

  priceCell.innerText=`${formatNumber(price)} 원`
  costCell.innerText=`${formatNumber(cost)} 원`

}

function refreshRecipePrices(){

  document.querySelectorAll(".recipe-material")
  .forEach(selectEl=>{
    onRecipeMaterialChange(selectEl)
  })

}

function refreshRecipeMaterialOptions(){

  document.querySelectorAll(".recipe-material")
  .forEach(selectEl=>{

    const current=Number(selectEl.value)

    let options=""

    materials.forEach(m=>{

      options+=`<option value="${m.id}"
      ${current===Number(m.id)?"selected":""}>
      ${m.name}
      </option>`

    })

    selectEl.innerHTML=options

  })

  refreshRecipePrices()

}

function updateRatioTotal(){

  const ratios=document.querySelectorAll(".recipe-ratio")

  let total=0

  ratios.forEach(input=>{
    total+=Number(input.value||0)
  })

  document.getElementById("ratioTotal").innerText=total

}

function calculate(){

  const rows=document.querySelectorAll("#recipeTable tbody tr")

  let materialCost=0

  rows.forEach(row=>{

    const price=parseFloat(row.querySelector(".recipe-price").innerText.replace(/[^0-9]/g,""))
    const ratio=row.querySelector(".recipe-ratio").value

    materialCost+=price*(ratio/100)

  })

  const mfg=Number(document.getElementById("mfg").value||0)
  const pack=Number(document.getElementById("pack").value||0)
  const logi=Number(document.getElementById("logi").value||0)
  const margin=Number(document.getElementById("margin").value||0)/100

  const totalCost=materialCost+mfg+pack+logi

  const quote=totalCost*(1+margin)

  document.getElementById("result").innerText=
  `${formatNumber(quote.toFixed(0))} 원`

}

loadMaterials()
