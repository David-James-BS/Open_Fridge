import { Progress } from '@/components/ui/progress';

interface PortionStatusBarProps {
  totalPortions: number;
  remainingPortions: number;
  reservedPortions: number;
}

export function PortionStatusBar({ 
  totalPortions, 
  remainingPortions, 
  reservedPortions 
}: PortionStatusBarProps) {
  const collectedPortions = totalPortions - remainingPortions;
  
  const availablePercent = ((remainingPortions - reservedPortions) / totalPortions) * 100;
  const reservedPercent = (reservedPortions / totalPortions) * 100;
  const collectedPercent = (collectedPortions / totalPortions) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Portion Status</span>
        <span className="font-medium">
          {remainingPortions - reservedPortions} available of {totalPortions} total
        </span>
      </div>
      
      {/* Multi-colored progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        {/* Available portions - green */}
        <div 
          className="absolute h-full bg-green-500 transition-all"
          style={{ width: `${availablePercent}%`, left: 0 }}
        />
        
        {/* Reserved portions - orange */}
        <div 
          className="absolute h-full bg-orange-500 transition-all"
          style={{ width: `${reservedPercent}%`, left: `${availablePercent}%` }}
        />
        
        {/* Collected portions - gray */}
        <div 
          className="absolute h-full bg-gray-400 transition-all"
          style={{ width: `${collectedPercent}%`, right: 0 }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            Available ({remainingPortions - reservedPortions})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">
            Reserved ({reservedPortions})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-muted-foreground">
            Collected ({collectedPortions})
          </span>
        </div>
      </div>
    </div>
  );
}
