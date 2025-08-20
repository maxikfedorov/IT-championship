// frontend/src/components/WindowSelector.jsx
import { Link } from "react-router-dom";

export default function WindowSelector({ totalWindows, user_id, batch_id }) {
  const windows = Array.from({ length: totalWindows }, (_, i) => i + 1);

  return (
    <div>
      <h4>Windows</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {windows.map((w) => (
          <Link
            key={w}
            to={`/details/${user_id}/${batch_id}/${w}`}
            style={{
              padding: "5px 10px",
              border: "1px solid #aaa",
              borderRadius: "4px",
              textDecoration: "none"
            }}
          >
            {w}
          </Link>
        ))}
      </div>
    </div>
  );
}
