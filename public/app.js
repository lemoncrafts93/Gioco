const ITALY_BOUNDS=[[35.2,6.5],[47.2,18.7]];
const map=L.map("map",{zoomControl:false,preferCanvas:true}).fitBounds(ITALY_BOUNDS);
L.control.zoom({position:"bottomright"}).addTo(map);
const dark=L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap &copy; CARTO"}).addTo(map);
const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Tiles &copy; Esri"});
L.control.layers({"Dark":dark,"Satellite":sat},null,{position:"bottomright"}).addTo(map);
let points=L.layerGroup().addTo(map), heatLayer=null, data=[], selected=null, watchId=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const color=x=>x>150?"#ff244e":x>50?"#ff6547":x>=10?"#ff9f43":"#ffd166";
const radius=x=>Math.max(3.5,Math.min(13,3.5+Math.sqrt(Math.max(x||0,0))*.58));
const conf=x=>({h:"Alta",n:"Nominale",l:"Bassa"}[String(x||"").toLowerCase()]||x||"—");
const time=ts=>ts?new Intl.DateTimeFormat("it-IT",{dateStyle:"short",timeStyle:"short"}).format(new Date(ts)):"—";
const ago=ts=>{if(!ts)return"—";let m=Math.max(0,Math.round((Date.now()-Date.parse(ts))/60000));return m<60?`${m} min fa`:m<1440?`${Math.floor(m/60)}h fa`:`${Math.floor(m/1440)}g fa`};
function filtered(){let min=+$("frp").value;return data.filter(f=>(f.frp||0)>=min&&(!$("confidence").checked||String(f.confidence).toLowerCase()==="h"))}
function popup(f){return `<div class="popup"><h3>🔥 Hotspot satellitare</h3><div class="popup-grid"><div><span>FRP</span><b>${f.frp??"—"} MW</b></div><div><span>Confidence</span><b>${esc(conf(f.confidence))}</b></div><div><span>Satellite</span><b>${esc(f.satellite)}</b></div><div><span>Acquisizione</span><b>${esc(time(f.timestamp))}</b></div><div><span>Latitudine</span><b>${(+f.lat).toFixed(4)}°</b></div><div><span>Longitudine</span><b>${(+f.lon).toFixed(4)}°</b></div></div><div class="popup-note">Rilevazione termica NASA FIRMS. Non equivale automaticamente a un incendio confermato.</div></div>`}
function draw(){
 points.clearLayers();let fs=filtered(),sum=fs.reduce((a,f)=>a+(f.frp||0),0),hi=fs.filter(f=>(f.frp||0)>=50).length,rec=fs.filter(f=>Date.now()-Date.parse(f.timestamp||"")<21600000).length;
 fs.forEach(f=>{let c=color(f.frp);L.circleMarker([f.lat,f.lon],{radius:radius(f.frp),color:c,fillColor:c,fillOpacity:.82,weight:1}).bindPopup(popup(f)).on("click",()=>select(f)).addTo(points)});
 $("count").textContent=fs.length.toLocaleString("it-IT");$("total").textContent=Math.round(sum).toLocaleString("it-IT");$("high").textContent=hi.toLocaleString("it-IT");$("recent").textContent=rec.toLocaleString("it-IT");$("mapCount").textContent=`${fs.length.toLocaleString("it-IT")} hotspot`;renderFeed(fs);drawHeat(fs)
}
function drawHeat(fs){if(heatLayer){map.removeLayer(heatLayer);heatLayer=null}if(!$("btnHeat").classList.contains("active"))return;let max=Math.max(1,...fs.map(f=>f.frp||1));heatLayer=L.layerGroup(fs.map(f=>L.circle([f.lat,f.lon],{radius:Math.max(800,Math.min(12000,(f.frp||1)/max*9000)),stroke:false,fillColor:"#ff5638",fillOpacity:.035}))).addTo(map)}
function renderFeed(fs){let top=[...fs].sort((a,b)=>(b.frp||0)-(a.frp||0)).slice(0,9);$("feed").innerHTML=top.map(f=>`<div class="feed-item" data-id="${esc(f.id)}"><i class="feed-dot" style="--c:${color(f.frp)}"></i><div class="feed-main"><b>${f.lat.toFixed(2)}°, ${f.lon.toFixed(2)}°</b><span>${esc(f.satellite)} · ${ago(f.timestamp)}</span></div><strong class="feed-frp">${f.frp??"—"} MW</strong></div>`).join("")||`<div style="font-size:9px;color:#647281;padding:10px 0">Nessuna rilevazione con i filtri correnti.</div>`;document.querySelectorAll(".feed-item").forEach(el=>el.onclick=()=>{let f=data.find(x=>x.id===el.dataset.id);if(f)select(f)})}
function select(f){selected=f;map.flyTo([f.lat,f.lon],Math.max(map.getZoom(),9),{duration:.7});L.popup().setLatLng([f.lat,f.lon]).setContent(popup(f)).openOn(map)}
async function load(){
 $("loading").classList.remove("hidden");$("error").classList.add("hidden");$("conn").textContent="Aggiornamento…";
 try{let q=`days=${$("days").value}&source=${encodeURIComponent($("source").value)}`;let r=await fetch(`/api/fires?${q}`,{cache:"no-store"}),j=await r.json();if(!r.ok)throw Error(j.error||"Errore API");data=j.fires||[];draw();$("updated").textContent=`${time(j.updatedAt)}`;$("mapTime").textContent=`agg. ${time(j.updatedAt)}`;$("conn").textContent=j.cached?"Dati recenti":"Online";$("connDot").style.background="#4de08a"}catch(e){$("conn").textContent="Offline";$("connDot").style.background="#ff5638";$("error").textContent=e.message;$("error").classList.remove("hidden")}finally{$("loading").classList.add("hidden")}}
$("refresh").onclick=load;$("days").onchange=load;$("source").onchange=load;$("frp").oninput=()=>{$("frpValue").textContent=`${$("frp").value} MW`;draw()};$("confidence").onchange=draw;$("clearSelection").onclick=()=>{selected=null;map.closePopup();map.fitBounds(ITALY_BOUNDS)};
$("btnItaly").onclick=()=>map.fitBounds(ITALY_BOUNDS,{padding:[20,20]});
$("btnHotspots").onclick=()=>{$("btnHeat").classList.remove("active");$("btnHotspots").classList.add("active");draw()};
$("btnHeat").onclick=()=>{$("btnHotspots").classList.remove("active");$("btnHeat").classList.add("active");draw()};
$("btnFull").onclick=()=>document.documentElement.requestFullscreen?.();
$("collapse").onclick=()=>document.querySelector(".panel").classList.toggle("mini");
$("locate").onclick=()=>{if(!navigator.geolocation)return; navigator.geolocation.getCurrentPosition(p=>map.flyTo([p.coords.latitude,p.coords.longitude],10),()=>alert("Posizione non disponibile."))};
load();setInterval(load,5*60*1000);
