// frontend/src/api/AuthContext.js

import { createContext, useContext } from "react";
import { useAuth } from "./useAuth";

// создаём контекст
const AuthContext = createContext(null);

// провайдер
export function AuthProvider({ children }) {
  const auth = useAuth(); // { user, login, logout }
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}


export function useAuthContext() {
  return useContext(AuthContext);
}
