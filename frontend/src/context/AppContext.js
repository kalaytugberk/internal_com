import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/api";

const AppContext = createContext(null);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [role, setRole] = useState("employee"); // "admin" | "employee"
  const [employees, setEmployees] = useState([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  useEffect(() => {
    api.employees().then((list) => {
      setEmployees(list);
      const firstEmp = list.find((e) => e.role === "employee") || list[0];
      if (firstEmp) setCurrentEmployeeId(firstEmp.id);
    });
  }, []);

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId) || null;

  return (
    <AppContext.Provider
      value={{ role, setRole, employees, currentEmployeeId, setCurrentEmployeeId, currentEmployee }}
    >
      {children}
    </AppContext.Provider>
  );
};
