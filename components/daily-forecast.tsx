"use client";

import { useState } from "react";

interface ForecastWrapperProps {
    issued_at: string;
    synopsis: string;
    forecast_weather_conditions: Array<{
        place: string;
        weather_condition: string;
        caused_by: string;
        impacts: string;
    }>;
    forecast_wind_conditions: Array<{
        place: string;
        wind_condition: string;
    }>;
    temperature_humidity: {
        [key: string]: {
            max: { value: string; time: string };
            min: { value: string; time: string };
        }
    };
    astronomical_information: {
        sun_rise: string;
        sun_set: string;
        moon_rise: string;
        moon_set: string;
        illumination: string;
    };
    tidal_predictions: Array<{
        type: string;
        value: string;
        time: string;
    }>;
}

export function DailyForecast() {
    const [forecast, setForecast] = useState<ForecastWrapperProps>();
    const [isLoading, setIsLoading] = useState(true);

    const fetchForecast = async () => {
        try {
            const response = await fetch('https://pagasa-forecast-api.vercel.app/api/pagasa-forecast');
            const data = await response.json();
            setForecast(data);
            setIsLoading(false);
        } catch (error) {
            console.error("Error fetching daily forecast:", error);
            setIsLoading(false);
        }
    };

    useState(() => {
        fetchForecast();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center">Loading forecast data...</div>;
    }

    return (

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                        Weather Forecast
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {forecast?.issued_at}
                    </span>
                </div>

                {forecast && (
                    <div className="space-y-6">
                        <section className="prose dark:prose-invert">
                            <h3 className="text-xl font-semibold">Synopsis</h3>
                            <p>{forecast.synopsis}</p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold mb-3">Weather Conditions</h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                {forecast.forecast_weather_conditions.map((condition, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <h4 className="font-bold">{condition.place}</h4>
                                        <p>{condition.weather_condition}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Caused by: {condition.caused_by}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Impacts: {condition.impacts}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Add more sections for temperature, astronomical info, etc. */}
                    </div>
                )}
            </div>
        
    );
}
