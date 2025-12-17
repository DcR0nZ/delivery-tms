import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudFog, CloudLightning, Snowflake, Umbrella, Thermometer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

  const getWeatherIcon = (code, size = "large") => {
    const iconSize = size === "large" ? "h-16 w-16" : "h-6 w-6";
    const className = `${iconSize} ${size === "large" ? "text-white opacity-90" : "text-white/90"}`;

    // WMO Weather interpretation codes (http://www.wmo.int/pages/prog/www/IMOP/WMO306.html)
    // 0: Clear sky
    if (code === 0) return <Sun className={className} />;
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    if ([1, 2, 3].includes(code)) return <Cloud className={className} />;
    // 45, 48: Fog
    if ([45, 48].includes(code)) return <CloudFog className={className} />;
    // 51, 53, 55, 61, 63, 65, 80, 81, 82: Rain
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className={className} />;
    // 71, 73, 75, 77, 85, 86: Snow
    if ([71, 73, 75, 77, 85, 86].includes(code)) return <Snowflake className={className} />;
    // 95, 96, 99: Thunderstorm
    if ([95, 96, 99].includes(code)) return <CloudLightning className={className} />;

    return <Cloud className={className} />;
  };

  const formatHour = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: 'numeric', hour12: true });
  };

  return (
    <Card className="bg-gradient-to-br from-blue-500 to-blue-700 h-full overflow-hidden relative">
      <CardContent className="p-0 h-full flex flex-col">
        {/* Current Weather Section */}
        <div className="p-4 flex-shrink-0">
          <div className="flex items-start justify-between text-white">
            <div>
              <h3 className="text-sm font-medium opacity-90">Brisbane</h3>
              {weather ? (
                <>
                  <div className="flex items-end mt-1">
                    <span className="text-4xl font-bold tracking-tighter">{Math.round(weather.temp)}°</span>
                    <span className="text-sm opacity-80 mb-1 ml-1 font-medium">{weather.description}</span>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs opacity-90">
                    <div className="flex items-center gap-1">
                      <Wind className="h-3 w-3" />
                      <span>{Math.round(weather.wind_speed)} km/h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      <span>{weather.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      <span>Feels {Math.round(weather.feels_like)}°</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-16 flex items-center text-sm opacity-80">
                  {weatherError || 'Loading forecast...'}
                </div>
              )}
            </div>
            {weather && (
              <div className="flex flex-col items-end">
                {getWeatherIcon(weather.code)}
                {weather.rain_amount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-blue-100 mt-1 bg-blue-600/30 px-2 py-0.5 rounded-full">
                    <Umbrella className="h-3 w-3" />
                    <span>{weather.rain_amount}mm</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hourly Forecast Scroll Area */}
        {weather && weather.hourly && (
          <div className="flex-1 bg-black/10 backdrop-blur-sm border-t border-white/10 mt-auto">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex p-3 gap-4">
                {weather.hourly.map((hour, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1 min-w-[3rem] text-white">
                    <span className="text-[10px] opacity-70">{formatHour(hour.time)}</span>
                    <div className="my-1">{getWeatherIcon(hour.code, "small")}</div>
                    <span className="text-sm font-bold">{Math.round(hour.temp)}°</span>
                    <div className="flex flex-col items-center mt-1 space-y-0.5">
                       {hour.rain_prob > 0 && (
                        <div className="flex items-center gap-0.5 text-[9px] text-blue-200">
                           <Umbrella className="h-2 w-2" />
                           <span>{hour.rain_prob}%</span>
                        </div>
                       )}
                       {hour.rain_amount > 0 && (
                        <span className="text-[9px] opacity-70">{hour.rain_amount}mm</span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="bg-white/10 h-1.5" />
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}