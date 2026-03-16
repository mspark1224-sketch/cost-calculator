function calc(){

let m1 = Number(document.getElementById("m1").value)
let m2 = Number(document.getElementById("m2").value)
let m3 = Number(document.getElementById("m3").value)

let r1 = Number(document.getElementById("r1").value)/100
let r2 = Number(document.getElementById("r2").value)/100
let r3 = Number(document.getElementById("r3").value)/100

let mfg = Number(document.getElementById("mfg").value)
let pack = Number(document.getElementById("pack").value)
let logi = Number(document.getElementById("logi").value)

let margin = Number(document.getElementById("margin").value)/100

let materialCost =
(m1*r1) +
(m2*r2) +
(m3*r3)

let totalCost =
materialCost +
mfg +
pack +
logi

let quotation =
totalCost * (1+margin)

document.getElementById("result").innerHTML =
"견적가 : " + quotation.toFixed(0) + " 원"

}