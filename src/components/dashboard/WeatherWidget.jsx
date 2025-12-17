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
      <CardContent className="p-0 h-full flex flex-col-reverse sm:flex-row">
        
        {/* Left Side (Bottom on mobile): Hourly Forecast List */}
        <div className="w-full sm:w-[45%] h-1/2 sm:h-full bg-black/10 backdrop-blur-sm border-t sm:border-t-0 sm:border-r border-white/10">
          {weather && weather.hourly ? (
            <ScrollArea className="h-full w-full">
              <div className="flex flex-col">
                {/* Optional Header Row */}
                {/* <div className="grid grid-cols-4 gap-1 p-2 text-[10px] font-semibold text-white/70 border-b border-white/10">
                  <span>Time</span>
                  <span className="text-center">Temp</span>
                  <span className="text-center">Rain</span>
                  <span className="text-right">Wind</span>
                </div> */}
                
                {weather.hourly.map((hour, idx) => (
                  <div key={idx} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center p-2 border-b border-white/5 text-white hover:bg-white/5 transition-colors">
                    <div className="flex flex-col min-w-[3rem]">
                      <span className="text-xs font-medium">{formatHour(hour.time)}</span>
                      <span className="text-[10px] opacity-70">{hour.description}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2">
                       {getWeatherIcon(hour.code, "small")}
                       <span className="text-sm font-bold">{Math.round(hour.temp)}°</span>
                    </div>

                    <div className="flex flex-col items-end gap-0.5 text-[10px]">
                      {(hour.rain_prob > 0 || hour.rain_amount > 0) ? (
                        <div className="flex items-center gap-1 text-blue-200">
                          <Umbrella className="h-3 w-3" />
                          <span>{hour.rain_prob}% {hour.rain_amount > 0 && `(${hour.rain_amount}mm)`}</span>
                        </div>
                      ) : (
                         <div className="flex items-center gap-1 opacity-60">
                            <Umbrella className="h-3 w-3" />
                            <span>--</span>
                         </div>
                      )}
                      <div className="flex items-center gap-1 opacity-70">
                         <Wind className="h-3 w-3" />
                         <span>{Math.round(hour.wind_speed)}km/h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="vertical" className="bg-white/10 w-1.5" />
            </ScrollArea>
          ) : (
            <div className="h-full flex items-center justify-center text-white/50 text-xs p-4">
              Loading forecast...
            </div>
          )}
        </div>

        {/* Right Side (Top on mobile): Current Weather */}
        <div className="w-full sm:flex-1 h-1/2 sm:h-full p-4 flex flex-col justify-center relative">
          <div className="text-white">
            <h3 className="text-sm font-medium opacity-90 mb-2">Brisbane Now</h3>
            {weather ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                     <span className="text-5xl font-bold tracking-tighter block">{Math.round(weather.temp)}°</span>
                     <span className="text-sm opacity-90 font-medium">{weather.description}</span>
                  </div>
                  <div className="scale-125 origin-right">
                    {getWeatherIcon(weather.code)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs opacity-90">
                  <div className="flex items-center gap-2 bg-white/10 rounded-md p-1.5">
                    <Wind className="h-3.5 w-3.5" />
                    <span>{Math.round(weather.wind_speed)} km/h</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-md p-1.5">
                    <Droplets className="h-3.5 w-3.5" />
                    <span>{weather.humidity}% Hum</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-md p-1.5">
                    <Thermometer className="h-3.5 w-3.5" />
                    <span>Feels {Math.round(weather.feels_like)}°</span>
                  </div>
                  {weather.rain_amount > 0 && (
                    <div className="flex items-center gap-2 bg-blue-500/30 rounded-md p-1.5 text-blue-100">
                      <Umbrella className="h-3.5 w-3.5" />
                      <span>{weather.rain_amount}mm</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                 <div className="h-8 w-24 bg-white/20 animate-pulse rounded"></div>
                 <div className="h-4 w-32 bg-white/10 animate-pulse rounded"></div>
              </div>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}