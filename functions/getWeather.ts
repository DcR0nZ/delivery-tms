import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
            throw new Error("Missing WillyWeather API Key");
        }

        // Brisbane coordinates
        const lat = -27.4698;
        const lon = 153.0251;

        // 1. Get Location ID
        const searchUrl = `https://api.willyweather.com.au/v2/${apiKey}/search/closest/${lat},${lon}`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`WillyWeather Search Failed: ${searchRes.statusText}`);
        const searchData = await searchRes.json();
        
        const locationId = searchData.location?.id;
        if (!locationId) throw new Error("Location not found");

        // 2. Fetch Weather Data
        // requesting forecasts: weather, rainfall, wind, precis, temperature
        // We'll ask for 2 days to cover "hourly" (though WillyWeather usually gives 3-hourly or specific intervals)
        const weatherUrl = `https://api.willyweather.com.au/v2/${apiKey}/locations/${locationId}/weather.json?forecasts=weather,rainfall,wind,precis,temperature&days=2`;
        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) throw new Error(`WillyWeather Data Failed: ${weatherRes.statusText}`);
        const weatherData = await weatherRes.json();

        // 3. Process Data
        // We need to map this to the format expected by the frontend:
        // temp, feels_like, description, code, humidity, wind_speed, wind_direction, rain_amount, precipitation
        // hourly: [{ time, temp, humidity, rain_prob, rain_amount, wind_speed, description, code }]

        const forecasts = weatherData.forecasts || {};
        const temperatureForecasts = forecasts.temperature?.days?.[0]?.entries || [];
        const rainfallForecasts = forecasts.rainfall?.days?.[0]?.entries || [];
        const windForecasts = forecasts.wind?.days?.[0]?.entries || [];
        const precisForecasts = forecasts.precis?.days?.[0]?.entries || [];
        const weatherForecasts = forecasts.weather?.days?.[0]?.entries || [];

        // Helper to find closest entry to now
        const now = new Date();
        const findClosest = (entries) => {
            if (!entries || entries.length === 0) return null;
            return entries.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.dateTime).getTime() - now.getTime());
                const currDiff = Math.abs(new Date(curr.dateTime).getTime() - now.getTime());
                return currDiff < prevDiff ? curr : prev;
            });
        };

        const currentTempEntry = findClosest(temperatureForecasts);
        const currentRainEntry = findClosest(rainfallForecasts);
        const currentWindEntry = findClosest(windForecasts);
        const currentPrecisEntry = findClosest(precisForecasts);
        const currentWeatherEntry = findClosest(weatherForecasts);

        const currentTemp = currentTempEntry?.t || 0;
        const currentPrecis = currentPrecisEntry?.precis || "Unknown";
        const currentCode = currentWeatherEntry?.code || 0;
        const currentWind = currentWindEntry?.speed || 0; // km/h usually
        const currentWindDir = currentWindEntry?.direction || 0;
        const currentRain = currentRainEntry?.amount || 0;
        const currentRainProb = currentRainEntry?.probability || 0;
        // WillyWeather might not give humidity in standard hourly feeds easily without 'humidity' forecast which requires 'weather' often covers it?
        // Let's assume humidity is missing or check if we can get it. For now, 0 or mock if unavailable.
        // Actually, let's assume we can't easily get current humidity without specific observation data.
        // Observation data endpoint: /locations/{id}/observational.json?observational=true
        // But for forecast we use what we have.
        
        // Try to get observational data for "Current" state
        let currentHum = 0;
        try {
            const obsUrl = `https://api.willyweather.com.au/v2/${apiKey}/locations/${locationId}/weather.json?observational=true`;
            const obsRes = await fetch(obsUrl);
            if (obsRes.ok) {
                const obsData = await obsRes.json();
                const obs = obsData.observational?.observations?.term?.temperature; // Structure varies
                // Let's look for humidity in observations if available
                // Usually observational data has: { temperature: { ... }, humidity: { ... } }
                if (obsData.observational?.observations?.term?.humidity) {
                     currentHum = obsData.observational.observations.term.humidity.v;
                }
            }
        } catch (e) {
            // ignore observation fetch error
        }

        // Map Hourly
        // We will combine entries by matching timestamps roughly or just taking temperature entries and finding matching others
        // WillyWeather entries might not align perfectly.
        const hourly = [];
        
        // Combine next 12 hours from temperature entries
        const futureTemps = temperatureForecasts
            .filter(e => new Date(e.dateTime) > now)
            .slice(0, 12);

        // Also look at day 2 if needed
        if (futureTemps.length < 12 && forecasts.temperature?.days?.[1]?.entries) {
            futureTemps.push(...forecasts.temperature.days[1].entries);
        }

        const mappedHourly = futureTemps.slice(0, 12).map(tempEntry => {
            const time = tempEntry.dateTime;
            const tDate = new Date(time);
            
            // Find matching entries
            const findMatch = (entries) => entries?.find(e => Math.abs(new Date(e.dateTime).getTime() - tDate.getTime()) < 3600000); // within 1 hour

            const rain = findMatch(rainfallForecasts) || findMatch(forecasts.rainfall?.days?.[1]?.entries);
            const wind = findMatch(windForecasts) || findMatch(forecasts.wind?.days?.[1]?.entries);
            const weather = findMatch(weatherForecasts) || findMatch(forecasts.weather?.days?.[1]?.entries);
            const precis = findMatch(precisForecasts) || findMatch(forecasts.precis?.days?.[1]?.entries);

            return {
                time: time,
                temp: Math.round(tempEntry.t),
                humidity: 0, // Not available in forecast usually
                rain_prob: rain?.probability || 0,
                rain_amount: rain?.amount || 0,
                wind_speed: wind?.speed || 0,
                description: precis?.precis || "",
                code: mapWillyWeatherCodeToWMO(weather?.code || 0)
            };
        });

        // Map Code Helper
        function mapWillyWeatherCodeToWMO(wwCode) {
            // Basic mapping
            // 1: Fine -> 0
            // 2: Mostly Fine -> 1
            // 3: High Cloud -> 2
            // 4: Partly Cloudy -> 2
            // 6: Cloudy -> 3
            // 8: Overcast -> 3
            // 11: Shower -> 80
            // 12: Showers -> 81
            // 16: Storm -> 95
            if ([1].includes(wwCode)) return 0;
            if ([2].includes(wwCode)) return 1;
            if ([3, 4].includes(wwCode)) return 2;
            if ([6, 7, 8].includes(wwCode)) return 3;
            if ([9, 10, 13].includes(wwCode)) return 45; // Fog/Haze
            if ([11].includes(wwCode)) return 80;
            if ([12].includes(wwCode)) return 81;
            if ([14, 15].includes(wwCode)) return 61; // Rain
            if ([16, 17].includes(wwCode)) return 95; // Storm
            return 2; // Default to partly cloudy
        }

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
            hourly: mappedHourly,
            provider: "WillyWeather"
        };

        return Response.json({ 
            success: true,
            data: currentData
        });

    } catch (error) {
        console.error('Error fetching weather:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch weather data',
            data: null
        }, { status: 200 });
    }
});