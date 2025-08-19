// frontend/src/api/schemaContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const SchemaContext = createContext();

export function SchemaProvider({ children }) {
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8000/features/schema")
      .then((res) => {
        setSchema(res.data); // ✅ сохраняем весь объект, а не только mapping
      })
      .catch(() => {
        console.error("⚠️ Failed to load feature schema");
      });
  }, []);

  return (
    <SchemaContext.Provider value={schema}>
      {children}
    </SchemaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSchema() {
  return useContext(SchemaContext);
}
