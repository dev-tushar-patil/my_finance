import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import TransactionRow from './TransactionRow';
import { SectionCard, Skeleton, EmptyState } from '../ui';
import useAsync from '../../hooks/useAsync';
import { transactionService } from '../../services/financeService';

export default function RecentTransactions({ refreshKey = 0, size = 6, title = 'Recent Transactions', className }) {
  const { data, loading } = useAsync(() => transactionService.list({ page: 0, size }), [refreshKey, size]);
  return (
    <SectionCard title={title} className={className} bodyClass="px-4 md:px-5 pb-3 pt-1"
      action={<Link to="/transactions" className="text-xs font-semibold text-primary-600 inline-flex items-center gap-1">View All <ArrowRight size={13} /></Link>}>
      {loading && !data ? (
        <div className="space-y-3 py-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : data?.content.length ? (
        <div className="divide-y divide-slate-100">{data.content.map((t) => <TransactionRow key={t.id} t={t} compact />)}</div>
      ) : (
        <EmptyState title="No transactions yet" message="Your latest entries will show up here." />
      )}
    </SectionCard>
  );
}
