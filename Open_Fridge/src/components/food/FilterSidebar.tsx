import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Filter, X } from 'lucide-react';
import { CuisineType, DietaryType } from '@/types/food';

const cuisineOptions: CuisineType[] = [
  'chinese', 'malay', 'indian', 'western', 'japanese',
  'korean', 'thai', 'vietnamese', 'italian', 'other'
];

const dietaryOptions: DietaryType[] = [
  'vegetarian', 'vegan', 'halal', 'kosher',
  'gluten_free', 'dairy_free', 'nut_free', 'none'
];

interface FilterState {
  search: string;
  cuisines: CuisineType[];
  dietary: DietaryType[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const handleCuisineToggle = (cuisine: CuisineType) => {
    const newCuisines = filters.cuisines.includes(cuisine)
      ? filters.cuisines.filter(c => c !== cuisine)
      : [...filters.cuisines, cuisine];
    onFilterChange({ ...filters, cuisines: newCuisines });
  };

  const handleDietaryToggle = (dietary: DietaryType) => {
    const newDietary = filters.dietary.includes(dietary)
      ? filters.dietary.filter(d => d !== dietary)
      : [...filters.dietary, dietary];
    onFilterChange({ ...filters, dietary: newDietary });
  };

  const handleClearAll = () => {
    onFilterChange({ search: '', cuisines: [], dietary: [] });
  };

  const hasActiveFilters = filters.search || filters.cuisines.length > 0 || filters.dietary.length > 0;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {(filters.cuisines.length + filters.dietary.length) || ''}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search food listings..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            />
          </div>

          {/* Cuisine Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Cuisine Type</Label>
            <div className="space-y-2">
              {cuisineOptions.map((cuisine) => (
                <div key={cuisine} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cuisine-${cuisine}`}
                    checked={filters.cuisines.includes(cuisine)}
                    onCheckedChange={() => handleCuisineToggle(cuisine)}
                  />
                  <label
                    htmlFor={`cuisine-${cuisine}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {cuisine}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Dietary Restrictions</Label>
            <div className="space-y-2">
              {dietaryOptions.map((dietary) => (
                <div key={dietary} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dietary-${dietary}`}
                    checked={filters.dietary.includes(dietary)}
                    onCheckedChange={() => handleDietaryToggle(dietary)}
                  />
                  <label
                    htmlFor={`dietary-${dietary}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {dietary}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
