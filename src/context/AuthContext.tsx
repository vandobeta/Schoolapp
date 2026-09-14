import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthState } from "../types";

interface AuthContextType extends AuthState {
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("token"),
    loading: true,
  });

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user && state.token) {
      setState({ user: JSON.parse(user), token: state.token, loading: false });
    } else {
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  const login = (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    setState({ user, token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setState({ user: null, token: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
