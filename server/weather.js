// Tonight's weather in Tampere from Open-Meteo (free, no key), with a canned fallback.

const URL_TAMPERE = 'https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.761&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=Europe/Helsinki';

export const CACHED_FORECAST = Object.freeze({ tempC: 4, rainChancePct: 70, summary: 'Rain likely this evening', cached: true });

const avg = (xs) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

export async function getEveningForecast({ fetch = globalThis.fetch } = {}) {
  try {
    const res = await fetch(URL_TAMPERE);
    if (!res.ok) throw new Error('weather service error');
    const { hourly } = await res.json();
    const idx = hourly.time.map((t, i) => [Number(t.slice(11, 13)), i]).filter(([h]) => h >= 18 && h <= 21).map(([, i]) => i);
    if (!idx.length) throw new Error('no evening hours');
    const tempC = avg(idx.map((i) => hourly.temperature_2m[i]));
    const rainChancePct = Math.round(avg(idx.map((i) => hourly.precipitation_probability[i])));
    const summary = rainChancePct >= 50 ? 'Rain likely this evening' : rainChancePct >= 25 ? 'Chance of showers this evening' : 'Dry this evening';
    return { tempC, rainChancePct, summary, cached: false };
  } catch {
    return { ...CACHED_FORECAST };
  }
}
