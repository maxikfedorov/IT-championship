// src\dashboard_service\frontend\src\components\Layout.jsx

import { Outlet } from "react-router-dom";
import Breadcrumbs from "./Breadcrumbs";

export default function Layout({ user, logout }) {
  return (
    <div>
      {/* Верхняя панель */}
      <header style={{ padding: "10px", borderBottom: "1px solid #ccc" }}>
        <h2>Motor Analytics Dashboard</h2>
        <div style={{ float: "right" }}>
          Logged in as <b>{user.username}</b> ({user.role})
          <button onClick={logout} style={{ marginLeft: "10px" }}>Logout</button>
        </div>
      </header>

      {/* Хлебные крошки */}
      <Breadcrumbs />

      {/* Основное содержимое */}
      <main style={{ padding: "10px" }}>
        <Outlet /> {/* сюда будет рендериться DashboardPage, BatchDetailsPage, WindowDetailsPage */}
      </main>
    </div>
  );
}
