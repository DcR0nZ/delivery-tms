import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Mapping WillyWeather codes to WMO codes (approximate)
// WMO Codes:
// 0: Clear sky, 1: Mainly clear, 2: Partly cloudy, 3: Overcast
// 45, 48: Fog
// 51, 53, 55: Drizzle
// 61, 63, 65: Rain
// 71, 73, 75: Snow
// 80, 81, 82: Rain showers
// 95, 96, 99: Thunderstorm
const mapWillyWeatherCodeToWMO = (wwCode) => {
    // WillyWeather codes (inferred/common knowledge):
    // 1: Fine/Sunny -> 0 (Clear)
    // 2: Mostly Fine -> 1 (Mainly clear)
    // 3: Partly Cloudy -> 2 (Partly cloudy)
    // 4: Cloudy -> 3 (Overcast)
    // 6: Dust/Haze -> 0 (Unknown, map to clear?) or maybe 45 (Fog-ish)
    // 7: Fog -> 45
    // 8: Showers -> 80
    // 9: Rain -> 61
    // 10: Storm -> 95
    // 11: Snow -> 71
    // 12: Windy -> 0 (Clear but windy?)
    // 13: Light Rain -> 51
    // 14: Heavy Rain -> 65
    // 15: Light Snow -> 71
    // 16: Heavy Snow -> 75
    // 17: Light Showers -> 80
    // 18: Heavy Showers -> 82

    const mapping = {
        1: 0,   // Fine
        2: 1,   // Mostly Fine
        3: 2,   // Partly Cloudy
        4: 3,   // Cloudy
        6: 45,  // Haze (Fog)
        7: 45,  // Fog
        8: 81,  // Showers
        9: 63,  // Rain
        10: 95, // Storm
        11: 73, // Snow
        12: 0,  // Windy (Clear)
        13: 51, // Light Rain
        14: 65, // Heavy Rain
        15: 71, // Light Snow
        16: 75, // Heavy Snow
        17: 80, // Light Showers
        18: 82  // Heavy Showers
    };

    return mapping[wwCode] || 0;
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const apiKey = Deno.env.get("WILLY_WEATHER_API_KEY");
        if (!apiKey) {
            throw new Error("WILLY_WEATHER_API_KEY is not set");
        }

        // Brisbane coordinates
        const lat = -27.4698;
        const lon = 153.0251;

        // 1. Search for closest location
        const searchUrl = `https://api.willyweather.com.au/v2/${apiKey}/search/closest.json?lat=${lat}&lng=${lon}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.statusText}`);
        const searchData = await searchRes.json();
        
        if (!searchData.location || !searchData.location.id) {
            console.error("Search response:", searchData);
            throw new Error("Could not find location");
        }

        const locationId = searchData.location.id;

        // 2. Fetch weather data
        // Forecasts: weather (current), temperature, rainfall, wind, humidity, precis (hourly-ish)
        const weatherUrl = `https://api.willyweather.com.au/v2/${apiKey}/locations/${locationId}/weather.json?forecasts=weather,temperature,rainfall,wind,humidity,precis&days=1`;
        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) throw new Error(`Weather fetch failed: ${weatherRes.statusText}`);
        const weatherData = await weatherRes.json();

        // 3. Transform Data
        // WillyWeather structure is a bit nested by forecast type
        const forecasts = weatherData.forecasts || {};
        
        // Helper to find closest forecast to now
        const now = new Date();
        
        // Current Weather (often in 'weather' -> days[0] -> entries[0])
        // Note: 'weather' forecast type usually gives daily summary, not current.
        // Actually, WillyWeather doesn't have a specific "current conditions" endpoint in the same way OpenMeteo does.
        // It provides "observational" data if we ask for it? 
        // Docs say: "observational" is a forecast type? No.
        // Let's assume we use the closest hourly/precis entry or the first 'weather' entry.
        // Wait, 'weather' forecast gives daily summaries. 'precis' gives 3-hourly textual.
        // 'temperature', 'wind', 'humidity' give hourly/3-hourly data points.
        
        // Let's look for hourly data. 
        // Usually temperature/wind/humidity/rainfall have entries with timestamps.
        
        const temps = forecasts.temperature?.days?.[0]?.entries || [];
        const winds = forecasts.wind?.days?.[0]?.entries || [];
        const humidity = forecasts.humidity?.days?.[0]?.entries || [];
        const rainfall = forecasts.rainfall?.days?.[0]?.entries || [];
        const precis = forecasts.precis?.days?.[0]?.entries || []; // Textual description
        const weather = forecasts.weather?.days?.[0]?.entries?.[0] || {}; // Daily summary

        // Helper to merge data by time
        // We'll create hourly slots for the next 12 hours from "now"
        // WillyWeather might provide data every 3 hours or 1 hour.
        
        // Find current values (closest to now)
        const findClosest = (entries) => {
            if (!entries || entries.length === 0) return null;
            // Sort by difference from now
            return entries.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(curr.dateTime).getTime() - now.getTime());
                const currDiff = Math.abs(new Date(prev.dateTime).getTime() - now.getTime());
                return prevDiff < currDiff ? curr : prev;
            });
        };

        const currentTemp = findClosest(temps)?.t || 0;
        const currentWind = findClosest(winds)?.speed || 0;
        const currentWindDir = findClosest(winds)?.direction || 0;
        const currentHum = findClosest(humidity)?.h || 0;
        const currentRain = findClosest(rainfall)?.amount || 0;
        const currentRainProb = findClosest(rainfall)?.probability || 0;
        const currentPrecis = findClosest(precis)?.precis || weather.precis || "Unknown";
        const currentCode = weather.code || 0; // Daily code, might be best approximation for current if no hourly code

        // Construct hourly forecast
        // We will align everything to the 'temperature' entries which are usually regular
        const next12Hours = temps.filter(t => new Date(t.dateTime) > now).slice(0, 12);
        
        const hourlyForecast = next12Hours.map(tEntry => {
            const time = tEntry.dateTime;
            const tDate = new Date(time);
            
            // Find matching entries for other types
            const match = (entries) => entries?.find(e => new Date(e.dateTime).getTime() === tDate.getTime());
            
            const wEntry = match(winds);
            const hEntry = match(humidity);
            const rEntry = match(rainfall);
            const pEntry = match(precis); // Precis might be 3-hourly, so might not match exactly. 
            // If precis doesn't match exactly, find the most recent one before this time
            const pEntryFallback = precis?.slice().reverse().find(e => new Date(e.dateTime) <= tDate);

            return {
                time: time,
                temp: Math.round(tEntry.t),
                humidity: hEntry?.h || 0,
                rain_prob: rEntry?.probability || 0,
                rain_amount: rEntry?.amount || 0,
                wind_speed: wEntry?.speed || 0,
                description: pEntry?.precis || pEntryFallback?.precis || "",
                code: pEntry?.precisCode || weather.code || 0 // Use precis code if available, else daily
            };
        });

        // Map codes
        const mappedHourly = hourlyForecast.map(h => ({
            ...h,
            code: mapWillyWeatherCodeToWMO(h.code)
        }));

        const currentData = {
            temp: Math.round(currentTemp),
            feels_like: Math.round(currentTemp), // WillyWeather doesn't always give apparent temp easily, use temp for now
            description: currentPrecis,
            code: mapWillyWeatherCodeToWMO(currentCode),
            humidity: currentHum,
            wind_speed: currentWind,
            wind_direction: currentWindDir,
            rain_amount: currentRain,
            precipitation: currentRainProb,
            hourly: mappedHourly
        };

        return Response.json({ 
            success: true,
            data: currentData,
            // debug: { searchData, weatherData } // Remove in prod
        });

    } catch (error) {
        console.error('Error fetching weather:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch weather data',
            data: null
        }, { status: 200 });
    }
});