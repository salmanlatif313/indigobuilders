interface Chip {
  value: string;
  label: string;
  count: number;
  color?: string; // optional override — Tailwind bg+text classes
}

interface ChipFilterProps {
  chips: Chip[];
  active: string;
  onChange: (value: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Draft:        'bg-yellow-100 text-yellow-800 ring-yellow-300',
  Reported:     'bg-blue-100 text-blue-800 ring-blue-300',
  Cleared:      'bg-green-100 text-green-800 ring-green-300',
  Rejected:     'bg-red-100 text-red-800 ring-red-300',
  Active:       'bg-emerald-100 text-emerald-800 ring-emerald-300',
  Completed:    'bg-gray-100 text-gray-700 ring-gray-300',
  'On Hold':    'bg-orange-100 text-orange-800 ring-orange-300',
  Materials:    'bg-amber-100 text-amber-800 ring-amber-300',
  Equipment:    'bg-cyan-100 text-cyan-800 ring-cyan-300',
  Subcontractor:'bg-violet-100 text-violet-800 ring-violet-300',
  Labor:        'bg-sky-100 text-sky-800 ring-sky-300',
  Transport:    'bg-teal-100 text-teal-800 ring-teal-300',
  Other:        'bg-slate-100 text-slate-700 ring-slate-300',
};

export default function ChipFilter({ chips, active, onChange }: ChipFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => {
        const isActive = chip.value === active;
        const colorClass = chip.color ?? STATUS_COLORS[chip.value] ?? 'bg-gray-100 text-gray-700 ring-gray-300';
        return (
          <button
            key={chip.value}
            onClick={() => onChange(isActive ? '' : chip.value)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              ring-1 transition-all select-none
              ${isActive
                ? `${colorClass} ring-2 shadow-sm scale-105`
                : 'bg-white text-gray-500 ring-gray-200 hover:ring-gray-300 hover:text-gray-700'}
            `}
          >
            {chip.label}
            <span className={`
              inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
              ${isActive ? 'bg-white/50' : 'bg-gray-100 text-gray-500'}
            `}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
