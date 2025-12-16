import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Droplets } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await base44.functions.invoke('getWeather');
        if (response.data?.data) {
          setWeather(response.data.data);
          setWeatherError(null);
        } else if (response.data?.error) {
          setWeatherError(response.data.error);
        }
      } catch (error) {
        setWeatherError('Failed to load weather');
      }
    };

    if (!document.hidden) fetchWeather();
  }, []);

  const getWeatherIcon = (condition) => {
    if (condition?.toLowerCase().includes('rain')) {
      return <Droplets className="h-16 w-16 text-white opacity-50" />;
    }
    return <Cloud className="h-16 w-16 text-white opacity-50" />;
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500 to-indigo-700 h-full">
      <CardContent className="p-6 h-full flex items-center">
        <div className="text-white w-full">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Brisbane Weather</p>
              {weather ? (
                <>
                  <div className="flex items-baseline mt-2">
                    <p className="text-5xl font-bold">{Math.round(weather.temp)}°</p>
                    <span className="text-2xl ml-2">C</span>
                  </div>
                  <p className="text-lg mt-2 capitalize opacity-90">{weather.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4" />
                      <span className="text-sm">{weather.rain_chance}% Rain</span>
                    </div>
                    <div className="text-sm">Humidity: {weather.humidity}%</div>
                  </div>
                </>
              ) : weatherError ? (
                <p className="text-lg mt-2">{weatherError}</p>
              ) : (
                <p className="text-lg mt-2">Loading...</p>
              )}
            </div>
            <div>{weather && getWeatherIcon(weather.description)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}