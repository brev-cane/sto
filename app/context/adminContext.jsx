import { createContext, useContext, useState } from 'react';

const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [showAdmin, setShowAdmin] = useState(true);

  return (
    <AdminContext.Provider value={{ showAdmin, setShowAdmin }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
