import { useCallback, useEffect, useState } from 'react';
import { accountService, paymentAppService, customerService, personService } from '../services/financeService';

/** Loads accounts, UPI apps, customers and persons used by transaction forms. */
export default function useFinanceLookups() {
  const [accounts, setAccounts] = useState([]);
  const [apps, setApps] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, c, pe] = await Promise.all([accountService.list(), paymentAppService.list(), customerService.list(), personService.list()]);
      setAccounts(a); setApps(p); setCustomers(c); setPersons(pe);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { accounts, apps, customers, persons, setCustomers, setPersons, setAccounts, setApps, loading, reload };
}
