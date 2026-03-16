let products = JSON.parse(localStorage.getItem("products")) || []
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

let name=document.getElementById("materialName").value.trim()
let price=document.getElementById("materialPrice").value

if(name=="" || price==""){
alert("원재료 이름과 단가를 입력하세요")
return
}

materials.push({
name:name,
price:Number(price)
})

localStorage.setItem("materials",JSON.stringify(materials))

document.getElementById("materialName").value=""
document.getElementById("materialPrice").value=""

loadMaterials()

}

function loadMaterials(){

let list=document.getElementById("materialList")

if(!list) return

list.innerHTML=""

materials.forEach((m,index)=>{

let li=document.createElement("li")

li.innerText=m.name+" : "+m.price+" 원"

list.appendChild(li)

})

}

loadMaterials()

function loadRecipe(){

let table=document.getElementById("recipeTable")

table.innerHTML="<tr><th>원재료</th><th>배합비 (%)</th></tr>"

}

function addRecipe(){

if(materials.length==0){
alert("먼저 원재료 DB를 입력하세요")
return
}

let table=document.getElementById("recipeTable")

let row=table.insertRow()

let cell1=row.insertCell(0)
let cell2=row.insertCell(1)

let select=document.createElement("select")

materials.forEach(m=>{
let option=document.createElement("option")
option.value=m.price
option.text=m.name
select.appendChild(option)
})

cell1.appendChild(select)

let ratioInput=document.createElement("input")
ratioInput.type="number"
ratioInput.value=0

cell2.appendChild(ratioInput)

}

function calculate(){

let table=document.getElementById("recipeTable")

let cost=0

for(let i=1;i<table.rows.length;i++){

let price=Number(table.rows[i].cells[0].children[0].value)
let ratio=Number(table.rows[i].cells[1].children[0].value)/100

cost+=price*ratio

}

let mfg=Number(document.getElementById("mfg").value)
let pack=Number(document.getElementById("pack").value)
let logi=Number(document.getElementById("logi").value)

let margin=Number(document.getElementById("margin").value)/100

let total=cost+mfg+pack+logi

let quote=total*(1+margin)

document.getElementById("result").innerText="견적가 : "+quote.toFixed(0)+" 원"

window.currentQuote=quote

}

function saveQuote(){

if(!window.currentQuote){
alert("먼저 계산하세요")
return
}

quotes.push({
price:window.currentQuote,
date:new Date().toLocaleString()
})

localStorage.setItem("quotes",JSON.stringify(quotes))

alert("저장되었습니다")

}

function loadQuotes(){

let list=document.getElementById("quoteList")

if(!list) return

list.innerHTML=""

quotes.forEach(q=>{

let li=document.createElement("li")

li.innerText=q.date+" / "+q.price+" 원"

list.appendChild(li)

})

}
