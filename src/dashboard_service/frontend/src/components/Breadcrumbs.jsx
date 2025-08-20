import { Link, useParams } from "react-router-dom";

export default function Breadcrumbs() {
  const { user_id, batch_id, window_id } = useParams();

  return (
    <nav style={{ marginBottom: "10px" }}>
      <Link to={`/dashboard/${user_id}`}>Dashboard</Link>
      {batch_id && (
        <>
          {" / "}
          <Link to={`/details/${user_id}/${batch_id}`}>Batch {batch_id}</Link>
        </>
      )}
      {window_id && (
        <>
          {" / "}
          <span>Window {window_id}</span>
        </>
      )}
    </nav>
  );
}
