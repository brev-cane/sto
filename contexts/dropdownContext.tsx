import React, { createContext, useContext, useRef } from "react";
import DropdownAlert from "react-native-dropdownalert";
import { SafeAreaView } from "react-native-safe-area-context";

// Define the valid alert types directly (string literal union)
type AlertType = "success" | "error" | "info" | "warn" | ""; // '' = custom

type AlertContextType = {
  showAlert: (type: AlertType, title: string, message?: string) => void;
  dismissAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const alertRef = useRef<any>(null);
  const dismissRef = useRef<() => void>(() => {});

  const showAlert: AlertContextType["showAlert"] = (type, title, message) => {
    if (alertRef.current) {
      alertRef.current({
        type,
        title,
        message,
      });
    }
  };

  const dismissAlert = () => {
    dismissRef.current?.();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AlertContext.Provider value={{ showAlert, dismissAlert }}>
        {children}
        <DropdownAlert
          alert={(func) => (alertRef.current = func)}
          dismiss={(func) => (dismissRef.current = func)}
          errorColor={"red"}
          successColor={"green"}
          zIndex={10}
        />
      </AlertContext.Provider>
    </SafeAreaView>
  );
};
