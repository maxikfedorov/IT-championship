// frontend/src/main.jsx
import ReactDOM from "react-dom/client";
import App from "./App";
import { SchemaProvider } from "./api/schemaContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <SchemaProvider>
    <App />
  </SchemaProvider>
);
