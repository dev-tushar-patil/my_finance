import { CalendarDays } from 'lucide-react';
import SmartSelect from './SmartSelect';
import { lastNMonths, monthLabel } from '../../utils/format';

export default function MonthPicker({ value, onChange, months = 12 }) {
  const options = lastNMonths(months).map((m) => ({ value: m, label: monthLabel(m) }));
  return (
    <div className="w-[170px] shrink-0">
      <SmartSelect value={value} options={options} onChange={onChange} icon={<CalendarDays size={16} className="text-navy-light" />} searchThreshold={99} />
    </div>
  );
}
