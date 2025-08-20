// frontend/src/main.jsx

import ReactDOM from "react-dom/client";
import App from "./App";
import { SchemaProvider } from "./api/schemaContext";
import { AuthProvider } from "./api/AuthContext";

import 'antd/dist/reset.css';
// import './index.css';

ReactDOM.createRoot(document.getElementById("root")).render(
  <SchemaProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </SchemaProvider>
);
