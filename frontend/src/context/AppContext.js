import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/api";

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [role, setRole] = useState(() => localStorage.getItem("pln_role") || "employee");
  const [employees, setEmployees] = useState([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(() => localStorage.getItem("pln_emp") || null);
  const [pulseRefresh, setPulseRefresh] = useState(0);
  const bumpPulse = () => setPulseRefresh((n) => n + 1);
  const [moodRefresh, setMoodRefresh] = useState(0);
  const bumpMood = () => setMoodRefresh((n) => n + 1);

  useEffect(() => { localStorage.setItem("pln_role", role); }, [role]);
  useEffect(() => { if (currentEmployeeId) localStorage.setItem("pln_emp", currentEmployeeId); }, [currentEmployeeId]);

  useEffect(() => {
    api.employees().then((list) => {
      setEmployees(list);
      setCurrentEmployeeId((prev) => {
        if (prev && list.some((e) => e.id === prev)) return prev;
        const firstEmp = list.find((e) => e.role === "employee") || list[0];
        return firstEmp ? firstEmp.id : null;
      });
    });
  }, []);

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId) || null;

  return (
    <AppContext.Provider
      value={{ role, setRole, employees, currentEmployeeId, setCurrentEmployeeId, currentEmployee, pulseRefresh, bumpPulse, moodRefresh, bumpMood }}
    >
      {children}
    </AppContext.Provider>
  );
};
