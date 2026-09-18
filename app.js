"use strict";

const $ = (id) => document.getElementById(id);
const state = { map:null, marker:null, routes:[], lat:47.1696, lon:16.0093 };
const colors = ["#e85d04","#0077b6","#6a4c93","#2a9d8f","#d00000","#588157","#f4a261","#4361ee"];

function initMap(){
  if (typeof L === "undefined") {
    document.getElementById("map").innerHTML = "<div style=\"padding:24px;background:#fff;color:#b42318\"><strong>Karte konnte nicht geladen werden.</strong><br>Bitte Internetverbindung oder Browser-Schutz prüfen.</div>";
    throw new Error("Leaflet wurde nicht geladen");
  }
  state.map=L.map("map").setView([state.lat,state.lon],10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; OpenStreetMap-Mitwirkende'}).addTo(state.map);
  state.marker=L.marker([state.lat,state.lon],{draggable:true}).addTo(state.map).bindPopup("Startplatz").openPopup();
  state.marker.on("dragend",e=>setLocation(e.target.getLatLng().lat,e.target.getLatLng().lng,"Gewählter Kartenpunkt",false));
  state.map.on("click",e=>setLocation(e.latlng.lat,e.latlng.lng,"Gewählter Kartenpunkt",false));
}

function setLocation(lat,lon,name="Gewählter Startort",pan=true){
  state.lat=Number(lat); state.lon=Number(lon);
  $("lat").value=state.lat.toFixed(5); $("lon").value=state.lon.toFixed(5);
  $("display-lat").textContent=state.lat.toFixed(5); $("display-lon").textContent=state.lon.toFixed(5);
  $("current-location-name").textContent=name;
  state.marker.setLatLng([state.lat,state.lon]); if(pan) state.map.setView([state.lat,state.lon],11);
  loadCurrentWind();
}

async function searchLocation(){
  const q=$("search-location").value.trim(); if(!q)return;
  setStatus("Ort wird gesucht …");
  try{
    const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=de&format=json&countryCode=AT`;
    const r=await fetch(url); if(!r.ok)throw new Error(`HTTP ${r.status}`);
    const d=await r.json(); if(!d.results?.length)throw new Error("Ort nicht gefunden");
    const x=d.results[0]; setLocation(x.latitude,x.longitude,[x.name,x.admin1].filter(Boolean).join(", "));
    setStatus("Startort aktualisiert.","success");
  }catch(e){setStatus(e.message,"error")}
}

function selectedHeights(){return [...document.querySelectorAll('input[name="altitude"]:checked')].map(x=>Number(x.value)).sort((a,b)=>a-b)}
function setStatus(text,type=""){const el=$("status");el.textContent=text;el.className=`status-message ${type}`}
function compass(deg){return ["N","NO","O","SO","S","SW","W","NW"][Math.round(deg/45)%8]}
function modelVar(kind,h){return `${kind}_${h}m`}
function circularInterpolate(a,b,t){const ar=a*Math.PI/180,br=b*Math.PI/180;let x=(1-t)*Math.cos(ar)+t*Math.cos(br),y=(1-t)*Math.sin(ar)+t*Math.sin(br);return (Math.atan2(y,x)*180/Math.PI+360)%360}
function valueAt(data,kind,height,index){
  const levels=[10,80,120,180]; if(levels.includes(height))return Number(data[modelVar(kind,height)][index]);
  let lo=levels[0],hi=levels.at(-1); if(height<=lo)return Number(data[modelVar(kind,lo)][index]); if(height>=hi)return Number(data[modelVar(kind,hi)][index]);
  for(let i=0;i<levels.length-1;i++)if(height>levels[i]&&height<levels[i+1]){lo=levels[i];hi=levels[i+1];break}
  const t=(height-lo)/(hi-lo),a=Number(data[modelVar(kind,lo)][index]),b=Number(data[modelVar(kind,hi)][index]);
  return kind==="wind_direction_10"?circularInterpolate(a,b,t):a+(b-a)*t;
}

function nearestTimeIndex(times,target){let best=0,d=Infinity;times.forEach((v,i)=>{const n=Math.abs(new Date(v).getTime()-target.getTime());if(n<d){d=n;best=i}});return best}
function movePoint(lat,lon,bearingDeg,distanceKm){const R=6371,b=bearingDeg*Math.PI/180,p1=lat*Math.PI/180,l1=lon*Math.PI/180,d=distanceKm/R;const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b));const l2=l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));return [p2*180/Math.PI,((l2*180/Math.PI+540)%360)-180]}

async function loadIconData(){
  const vars=[10,80,120,180].flatMap(h=>[`wind_speed_${h}m`,`wind_direction_${h}m`]).join(",");
  const params=new URLSearchParams({latitude:state.lat,longitude:state.lon,hourly:vars,current:"wind_speed_10m,wind_direction_10m,wind_gusts_10m",models:"icon_d2",wind_speed_unit:"kmh",timezone:"Europe/Vienna",forecast_days:"3"});
  const r=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`); if(!r.ok)throw new Error(`Wetterdienst meldet HTTP ${r.status}`); return r.json();
}

async function loadCurrentWind(){
  try{const p=new URLSearchParams({latitude:state.lat,longitude:state.lon,current:"wind_speed_10m,wind_direction_10m,wind_gusts_10m",models:"icon_d2",wind_speed_unit:"kmh",timezone:"Europe/Vienna"});const r=await fetch(`https://api.open-meteo.com/v1/forecast?${p}`);if(!r.ok)throw new Error();const d=await r.json(),c=d.current;$("current-wind").textContent=`${c.wind_speed_10m.toFixed(1)} km/h, Böen ${c.wind_gusts_10m.toFixed(1)} km/h`;$("current-direction").textContent=`Richtung: ${c.wind_direction_10m.toFixed(0)}° (${compass(c.wind_direction_10m)})`;}catch{$("current-wind").textContent="Derzeit nicht verfügbar";$("current-direction").textContent="Richtung: --"}}

async function runSimulation(){
  const heights=selectedHeights(); if(!heights.length){setStatus("Bitte mindestens eine Höhe auswählen.","error");return}
  const start=new Date(`${$("date").value}T${$("start").value}:00`); if(Number.isNaN(start.getTime())){setStatus("Datum und Startzeit prüfen.","error");return}
  const hours=Number($("duration").value); $("run").disabled=true;setStatus("ICON-D2-Daten werden geladen …");clearRoutes();
  try{
    const data=await loadIconData(),idx=nearestTimeIndex(data.hourly.time,start),rows=[];
    heights.forEach((h,n)=>{let lat=state.lat,lon=state.lon,path=[[lat,lon]];const steps=Math.max(1,Math.ceil(hours*4));for(let s=0;s<steps;s++){const i=Math.min(idx+Math.floor(s/4),data.hourly.time.length-1);const speed=valueAt(data.hourly,"wind_speed_10",h,i);const dir=valueAt(data.hourly,"wind_direction_10",h,i);[lat,lon]=movePoint(lat,lon,(dir+180)%360,speed*0.25);path.push([lat,lon])}const speed=valueAt(data.hourly,"wind_speed_10",h,idx),dir=valueAt(data.hourly,"wind_direction_10",h,idx);rows.push({h,speed,dir,end:[lat,lon],color:colors[n%colors.length],path});});
    renderResults(rows); drawRoutes(rows); setStatus("ICON-D2-Berechnung abgeschlossen.","success");
  }catch(e){console.error(e);setStatus(`Fehler: ${e.message}`,"error")}finally{$("run").disabled=false}
}

function renderResults(rows){$("results").innerHTML=rows.map(r=>`<div class="result-row"><span class="altitude">${r.h} m</span><div><span class="wind-arrow" style="transform:rotate(${r.dir}deg)">↑</span> ${r.dir.toFixed(0)}° (${compass(r.dir)})</div><div class="wind-data"><strong>${r.speed.toFixed(1)} km/h</strong><br>${r.h===10||r.h===80||r.h===120||r.h===180?"Modellwert":"interpoliert"}</div></div>`).join("")}
function clearRoutes(){state.routes.forEach(x=>state.map.removeLayer(x));state.routes=[]}
function drawRoutes(rows){const bounds=L.latLngBounds([[state.lat,state.lon]]);rows.forEach(r=>{const line=L.polyline(r.path,{color:r.color,weight:4,opacity:.85}).addTo(state.map).bindPopup(`${r.h} m · ${r.speed.toFixed(1)} km/h`);const end=L.circleMarker(r.end,{radius:6,color:r.color,fillOpacity:1}).addTo(state.map);state.routes.push(line,end);r.path.forEach(p=>bounds.extend(p))});state.map.fitBounds(bounds.pad(.16))}

function init(){
  initMap(); const today=new Date(); $("date").value=today.toISOString().slice(0,10);
  $("duration").addEventListener("input",e=>$("duration-val").textContent=`${Number(e.target.value).toLocaleString("de-AT")} Stunden`);
  $("search-button").addEventListener("click",searchLocation); $("search-location").addEventListener("keydown",e=>{if(e.key==="Enter")searchLocation()});
  $("run").addEventListener("click",runSimulation); $("btn-all-levels").addEventListener("click",()=>document.querySelectorAll('input[name="altitude"]').forEach(x=>x.checked=true));
  $("btn-no-levels").addEventListener("click",()=>document.querySelectorAll('input[name="altitude"]').forEach(x=>x.checked=false));
  $("btn-balloon-levels").addEventListener("click",()=>document.querySelectorAll('input[name="altitude"]').forEach(x=>x.checked=[80,100,150,180].includes(Number(x.value))));
  loadCurrentWind();
}
document.addEventListener("DOMContentLoaded",()=>{try{init()}catch(error){console.error(error);const status=document.getElementById("status");if(status){status.textContent=error.message;status.className="status-message error"}}});
