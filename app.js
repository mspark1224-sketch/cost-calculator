let materials = JSON.parse(localStorage.getItem("materials")) || []
let quotes = JSON.parse(localStorage.getItem("quotes")) || []

function showPage(id){

document.querySelectorAll(".page").forEach(p=>{
p.style.display="none"
})

document.getElementById(id).style.display="block"

if(id=="recipe") loadRecipe()
if(id=="history") loadQuotes()

}

function saveMaterial(){

let name=document.getElementById("materialName").value
let price=document.getElementById("materialPrice").value

materials.push({name,price})

localStorage.setItem("materials",JSON.stringify(materials))

loadMaterials()

}

function loadMaterials(){

let list=document.getElementById("materialList")

list.innerHTML=""

materials.forEach(m=>{

let li=document.createElement("li")

li.innerText=m.name+" : "+m.price+"원"

list.appendChild(li)

})

}

loadMaterials()

function loadRecipe(){

let table=document.getElementById("recipeTable")

table.innerHTML="<tr><th>원재료</th><th>배합비</th></tr>"

}

function addRecipe(){

let table=document.getElementById("recipeTable")

let row=table.insertRow()

let cell1=row.insertCell(0)
let cell2=row.insertCell(1)

let select="<select>"

materials.forEach(m=>{
select+=`<option value="${m.price}">${m.name}</option>`
})

select+="</select>"

cell1.innerHTML=select
cell2.innerHTML='<input type="number" value="0">'

}

function calculate(){

let table=document.getElementById("recipeTable")

let cost=0

for(let i=1;i<table.rows.length;i++){

let price=table.rows[i].cells[0].children[0].value
let ratio=table.rows[i].cells[1].children[0].value/100

cost+=price*ratio

}

let mfg=Number(document.getElementById("mfg").value)
let pack=Number(document.getElementById("pack").value)
let logi=Number(document.getElementById("logi").value)

let margin=document.getElementById("margin").value/100

let total=cost+mfg+pack+logi

let quote=total*(1+margin)

document.getElementById("result").innerText="견적가 : "+quote.toFixed(0)+" 원"

window.currentQuote=quote

}

function saveQuote(){

quotes.push({
price:window.currentQuote,
date:new Date().toLocaleString()
})

localStorage.setItem("quotes",JSON.stringify(quotes))

alert("저장되었습니다")

}

function loadQuotes(){

let list=document.getElementById("quoteList")

list.innerHTML=""

quotes.forEach(q=>{

let li=document.createElement("li")

li.innerText=q.date+" / "+q.price+" 원"

list.appendChild(li)

})

}
