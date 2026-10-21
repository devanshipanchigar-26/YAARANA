import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { normalizeTableNo, formatTableLabel } from '../utils/billingUtils';

const TableContext = createContext(null);
const STORAGE_KEY = 'yaarana_dinein_table';

export function TableProvider({ children }) {
  const [activeTable, setActiveTable] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [availableTables, setAvailableTables] = useState([]);
  const [isValidating, setIsValidating] = useState(true);
  const [tableError, setTableError] = useState('');

  // Fetch all active tables from database
  const fetchAvailableTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cafe_tables')
        .select('*')
        .order('display_order', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.warn('Error fetching cafe_tables:', error.message);
        return [];
      }
      const tables = data || [];
      setAvailableTables(tables);
      return tables;
    } catch (err) {
      console.error('Error in fetchAvailableTables:', err);
      return [];
    }
  }, []);

  // Validate and set table by number or ID
  const setTableByNumber = useCallback(
    async (tableInput, qrToken = null) => {
      const normInput = normalizeTableNo(tableInput);
      if (!normInput) {
        setActiveTable(null);
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {}
        return { success: false, error: 'Empty table number' };
      }

      setIsValidating(true);
      setTableError('');

      try {
        // Query database for this specific table
        const { data, error } = await supabase
          .from('cafe_tables')
          .select('*')
          .or(`table_no.eq."${normInput}",table_no.eq."${tableInput}"`)
          .maybeSingle();

        if (error) {
          console.warn('Error validating table in database:', error.message);
        }

        let matchedTable = data;

        // Fallback: If table exists in local state
        if (!matchedTable && availableTables.length > 0) {
          matchedTable = availableTables.find(
            (t) => normalizeTableNo(t.table_no) === normInput
          );
        }

        if (matchedTable) {
          // Check if table is marked inactive
          if (matchedTable.is_active === false) {
            const msg = `Table ${matchedTable.table_no} is currently inactive or under maintenance. Please ask cafe staff for assistance.`;
            setTableError(msg);
            setActiveTable(null);
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {}
            return { success: false, error: msg, table: matchedTable };
          }

          // Verified active table
          const tableRecord = {
            id: matchedTable.id,
            table_no: matchedTable.table_no,
            seats: matchedTable.seats || 2,
            is_active: true,
            qr_token: matchedTable.qr_token || null,
            scannedToken: qrToken || null,
            verified_at: new Date().toISOString(),
          };

          setActiveTable(tableRecord);
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tableRecord));
          } catch {}

          return { success: true, table: tableRecord };
        } else {
          // Unrecognized table number
          const msg = `Table "${tableInput}" is not recognized as a valid YAARANA Cafe table.`;
          setTableError(msg);
          setActiveTable(null);
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {}
          return { success: false, error: msg };
        }
      } catch (err) {
        console.error('Validation error:', err);
        setTableError('Failed to verify table identity.');
        return { success: false, error: err.message };
      } finally {
        setIsValidating(false);
      }
    },
    [availableTables]
  );

  // Clear active table (e.g., when leaving or clearing dine-in mode)
  const clearTable = useCallback(() => {
    setActiveTable(null);
    setTableError('');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Initial mount: Check URL for QR parameters (?table=5&token=...)
  useEffect(() => {
    let isMounted = true;

    const initTableSession = async () => {
      setIsValidating(true);
      await fetchAvailableTables();

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlTable = params.get('table');
        const urlToken = params.get('token');

        if (urlTable) {
          // QR code scan detected from URL!
          await setTableByNumber(urlTable, urlToken);
        } else {
          // No URL param: check persisted session storage
          try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.table_no && isMounted) {
                setActiveTable(parsed);
              }
            }
          } catch {}
        }
      }

      if (isMounted) {
        setIsValidating(false);
      }
    };

    initTableSession();

    return () => {
      isMounted = false;
    };
  }, [fetchAvailableTables, setTableByNumber]);

  const value = {
    activeTable,
    tableNo: activeTable?.table_no || '',
    tableLabel: activeTable?.table_no ? formatTableLabel(activeTable.table_no) : '',
    isValidating,
    tableError,
    availableTables,
    setTableByNumber,
    clearTable,
    refreshTables: fetchAvailableTables,
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTable() {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTable must be used within a TableProvider');
  }
  return context;
}
