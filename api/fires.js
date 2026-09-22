const cache = new Map();
const CACHE_MS = 4 * 60 * 1000;

const SOURCES = [
  "VIIRS_NOAA21_NRT",
  "VIIRS_NOAA20_NRT"
];

const DEFAULT_BBOX = [6.5, 35.3, 18.6, 47.2]; // Italy + nearby waters

function clean(value) {
  return String(value ?? "").trim();
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"') {
      if (quoted && n === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field); field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && n === "\n") i++;
      row.push(field); field = "";
      if (row.some(x => clean(x) !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    if (row.some(x => clean(x) !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map(clean);
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h,i)=>[h, clean(r[i])])));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalize(r, source) {
  const acqDate = r.acq_date || "";
  const acqTime = String(r.acq_time || "").padStart(4, "0");
  const iso = acqDate && acqTime.length >= 4
    ? `${acqDate}T${acqTime.slice(0,2)}:${acqTime.slice(2,4)}:00Z`
    : null;

  return {
    id: `${source}:${r.latitude}:${r.longitude}:${acqDate}:${acqTime}`,
    lat: num(r.latitude),
    lon: num(r.longitude),
    brightness: num(r.bright_ti4),
    brightnessNight: num(r.bright_ti5),
    frp: num(r.frp),
    confidence: r.confidence || null,
    satellite: r.satellite || source.replace("VIIRS_","").replace("_NRT",""),
    instrument: r.instrument || "VIIRS",
    daynight: r.daynight || null,
    scan: num(r.scan),
    track: num(r.track),
    acqDate,
    acqTime,
    timestamp: iso,
    source
  };
}

function bboxValid(b) {
  return Array.isArray(b) && b.length === 4 &&
    b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3] &&
    b[0] >= -180 && b[2] <= 180 && b[1] >= -90 && b[3] <= 90;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    return res.status(500).json({
      error: "FIRMS_MAP_KEY non configurata",
      hint: "Aggiungi FIRMS_MAP_KEY nelle Environment Variables di Vercel."
    });
  }

  const sourceParam = clean(req.query.source);
  const sourceList = sourceParam
    ? sourceParam.split(",").filter(s => SOURCES.includes(s))
    : SOURCES;

  const bbox = clean(req.query.bbox).split(",").map(Number);
  const box = bboxValid(bbox) ? bbox : DEFAULT_BBOX;
  const days = Math.min(Math.max(Number(req.query.days) || 1, 1), 5);

  const cacheKey = `${sourceList.join(",")}|${box.join(",")}|${days}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_MS) {
    return res.status(200).json({ ...cached.data, cached: true });
  }

  try {
    const area = box.join(",");
    const results = await Promise.all(sourceList.map(async source => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(key)}/${source}/${area}/${days}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${source}: FIRMS HTTP ${response.status}`);
      const text = await response.text();
      return parseCSV(text).map(r => normalize(r, source));
    }));

    const seen = new Set();
    const fires = results.flat().filter(f => {
      if (f.lat == null || f.lon == null) return false;
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    fires.sort((a,b) => (Date.parse(b.timestamp || "") || 0) - (Date.parse(a.timestamp || "") || 0));

    const data = {
      updatedAt: new Date().toISOString(),
      count: fires.length,
      sources: sourceList,
      days,
      bbox: box,
      fires
    };

    cache.set(cacheKey, { time: Date.now(), data });
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: "Impossibile recuperare i dati NASA FIRMS",
      detail: err.message
    });
  }
};
