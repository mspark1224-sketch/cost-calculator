let materials = JSON.parse(localStorage.getItem("materials")) || []
let quotes = JSON.parse(localStorage.getItem("quotes")) || []

let editMaterialId = null

function saveData(){
localStorage.setItem("materials",JSON.stringify(materials))
localStorage.setItem("quotes",JSON.stringify(quotes))
}

function showPage(id){

document.querySelectorAll(".page").forEach(p=>{
p.style.display="none"
})

document.getElementById(id).style.display="block"

if(id==="db") loadMaterials()
if(id==="history") loadQuotes()

}

function clearMaterialInputs(){

editMaterialId=null

document.getElementById("materialCode").value=""
document.getElementById("materialName").value=""
document.getElementById("materialPrice").value=""
document.getElementById("materialDate").value=""

}

function saveMaterial(){

let code=document.getElementById("materialCode").value
let name=document.getElementById("materialName").value
let price=document.getElementById("materialPrice").value
let date=document.getElementById("materialDate").value

materials.push({
id:Date.now(),
code,
name,
price,
date
})

saveData()

loadMaterials()

clearMaterialInputs()

}

function editMaterial(id){

let m=materials.find(x=>x.id===id)

editMaterialId=id

document.getElementById("materialCode").value=m.code
document.getElementById("materialName").value=m.name
document.getElementById("materialPrice").value=m.price
document.getElementById("materialDate").value=m.date

}

function updateMaterial(){

if(editMaterialId===null) return

let m=materials.find(x=>x.id===editMaterialId)

m.code=document.getElementById("materialCode").value
m.name=document.getElementById("materialName").value
m.price=document.getElementById("materialPrice").value
m.date=document.getElementById("materialDate").value

saveData()

loadMaterials()

clearMaterialInputs()

}

function deleteMaterial(id){

materials=materials.filter(x=>x.id!==id)

saveData()

loadMaterials()

}

function loadMaterials(){

let list=document.getElementById("materialList")

let keyword=(document.getElementById("materialSearch").value||"").toLowerCase()

list.innerHTML=""

materials
.filter(m=>
m.name.toLowerCase().includes(keyword)||
m.code.toLowerCase().includes(keyword)
)
.forEach((m,i)=>{

let tr=document.createElement("tr")

tr.innerHTML=`

<td>${i+1}</td>
<td>${m.code}</td>
<td>${m.name}</td>
<td>${Number(m.price).toLocaleString()} 원</td>
<td>${m.date||""}</td>

<td>
<button onclick="editMaterial(${m.id})">
수정
</button>
</td>

<td>
<button onclick="deleteMaterial(${m.id})">
삭제
</button>
</td>

`

list.appendChild(tr)

})

}

function addRecipe(){

let table=document.querySelector("#recipeTable tbody")

let row=table.insertRow()

let cell1=row.insertCell(0)
let cell2=row.insertCell(1)
let cell3=row.insertCell(2)
let cell4=row.insertCell(3)
let cell5=row.insertCell(4)

let select="<select>"

materials.forEach(m=>{
select+=`<option value="${m.price}">${m.name}</option>`
})

select+="</select>"

cell1.innerHTML=select
cell2.innerHTML="0"
cell3.innerHTML='<input type="number" value="0">'
cell4.innerHTML="0"
cell5.innerHTML='<button onclick="this.parentNode.parentNode.remove()">삭제</button>'

}

function calculate(){

let table=document.querySelector("#recipeTable tbody")

let cost=0

Array.from(table.rows).forEach(r=>{

let price=r.cells[0].children[0].value
let ratio=r.cells[2].children[0].value

cost+=price*(ratio/100)

})

let mfg=Number(document.getElementById("mfg").value||0)
let pack=Number(document.getElementById("pack").value||0)
let logi=Number(document.getElementById("logi").value||0)
let margin=Number(document.getElementById("margin").value||0)/100

let total=cost+mfg+pack+logi

let quote=total*(1+margin)

document.getElementById("result").innerText=quote.toLocaleString()+" 원"

quotes.push({
product:document.getElementById("productName").value,
price:quote,
date:new Date().toLocaleString()
})

saveData()

}

function loadQuotes(){

let list=document.getElementById("quoteList")

list.innerHTML=""

quotes.forEach(q=>{

let tr=document.createElement("tr")

tr.innerHTML=`

<td>${q.product}</td>
<td>${Number(q.price).toLocaleString()} 원</td>
<td>${q.date}</td>
<td><button onclick="deleteQuote('${q.date}')">삭제</button></td>

`

list.appendChild(tr)

})

}

function deleteQuote(date){

quotes=quotes.filter(q=>q.date!==date)

saveData()

loadQuotes()

}

loadMaterials()
