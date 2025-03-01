import React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

export interface City {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
}

interface CitySelectorProps extends React.HTMLAttributes<HTMLDivElement> {
  cities: City[];
  selectedCity: City;
  onSelectCity: (city: City) => void;
}

const CitySelector = React.forwardRef<HTMLDivElement, CitySelectorProps>(
  ({ className, cities, selectedCity, onSelectCity, ...props }, ref) => {
    return (
      <div 
        className={cn(
          "p-4 bg-white rounded-lg shadow-md flex flex-wrap gap-2 max-w-full overflow-x-auto",
          className
        )} 
        ref={ref}
        {...props}
      >
        {cities.map((city) => (
          <Button
            key={city.id}
            variant={city.id === selectedCity.id ? "default" : "outline"}
            onClick={() => onSelectCity(city)}
            className="whitespace-nowrap"
          >
            {city.name}
          </Button>
        ))}
      </div>
    );
  }
);

CitySelector.displayName = "CitySelector";

export { CitySelector };
