export type UsageLog = {
    date: string; // YYYY-MM-DD
    time: string; // HH:mm:ss
    expected_pension: number | null;
    age: number;
    sex: "male" | "female" | string;
    salary_amount: number; // monthly gross
    sick_leave_included: boolean;
    funds_accumulated: number | null;
    actual_pension: number; // nominal
    real_pension: number; // inflation-adjusted
    postal_code?: string | null;
  };
  
  const STORAGE_KEY = "zus-sim-logs";
  
  export function logSimulation(entry: UsageLog) {
    try {
      const prev = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || "[]" : "[]");
      prev.push(entry);
      if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
    } catch (e) {
      console.error("Failed to persist usage log", e);
    }
  }
  
  export function readLogs(): UsageLog[] {
    try {
      const data = JSON.parse(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || "[]" : "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  
  export function clearLogs() {
    try {
      if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  
export function logSimulationIfNew(entry: UsageLog, key: string) {
  try {
    // session-only guard (survives renders, resets on tab close)
    const lastKey = sessionStorage.getItem("zus-last-log-key");
    if (lastKey === key) return false;
    sessionStorage.setItem("zus-last-log-key", key);
    logSimulation(entry); // your existing function
    return true;
  } catch {
    // fallback: still log
    logSimulation(entry);
    return true;
  }
}
