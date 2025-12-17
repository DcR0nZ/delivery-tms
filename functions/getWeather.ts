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

        // Brisbane coordinates
        const lat = -27.4698;
        const lon = 153.0251;

        // Fetch detailed weather from Open-Meteo (No API key required)
        // Requesting current weather and hourly forecast for the next 24h
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,rain,weather_code,wind_speed_10m&timezone=auto&forecast_days=2`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();

        // Helper to interpret WMO weather codes
        const getWeatherDescription = (code) => {
            const codes = {
                0: 'Clear sky',
                1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
                45: 'Fog', 48: 'Depositing rime fog',
                51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
                61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
                71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
                77: 'Snow grains',
                80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
                85: 'Slight snow showers', 86: 'Heavy snow showers',
                95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
            };
            return codes[code] || 'Unknown';
        };

        // Process hourly data for the next 12 hours
        const currentHour = new Date().getHours();
        const hourlyIndices = data.hourly.time
            .map((t, i) => ({ time: new Date(t), index: i }))
            .filter(({ time }) => time > new Date())
            .slice(0, 12);

        const hourlyForecast = hourlyIndices.map(({ time, index }) => ({
            time: time.toISOString(),
            temp: Math.round(data.hourly.temperature_2m[index]),
            humidity: data.hourly.relative_humidity_2m[index],
            rain_prob: data.hourly.precipitation_probability[index],
            rain_amount: data.hourly.rain[index],
            wind_speed: data.hourly.wind_speed_10m[index],
            description: getWeatherDescription(data.hourly.weather_code[index]),
            code: data.hourly.weather_code[index]
        }));

        const weatherData = {
            temp: Math.round(data.current.temperature_2m),
            feels_like: Math.round(data.current.apparent_temperature),
            description: getWeatherDescription(data.current.weather_code),
            code: data.current.weather_code,
            humidity: data.current.relative_humidity_2m,
            wind_speed: data.current.wind_speed_10m,
            wind_direction: data.current.wind_direction_10m,
            rain_amount: data.current.rain,
            precipitation: data.current.precipitation,
            hourly: hourlyForecast
        };

        return Response.json({ 
            success: true,
            data: weatherData
        });

    } catch (error) {
        console.error('Error fetching weather:', error);
        return Response.json({ 
            error: error.message || 'Failed to fetch weather data',
            data: null
        }, { status: 200 });
    }
});