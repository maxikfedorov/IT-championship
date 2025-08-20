// frontend/src/components/DownloadReportButton.jsx
import api from "../api/apiClient";

export default function DownloadReportButton({ type, ids }) {
  const handleDownload = (format) => {
    let url = `/report/${type}`;
    if (type === "dashboard") url += `/${ids.user_id}`;
    if (type === "batch") url += `/${ids.batch_id}`;
    if (type === "window") url += `/${ids.batch_id}/window/${ids.window_id}`;

    api.get(url + `?format=${format}`, { responseType: "blob" })
      .then((res) => {
        const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", `${type}_report.${format}`);
        document.body.appendChild(link);
        link.click();
      })
      .catch((err) => console.error("Report download failed", err));
  };

  return (
    <div>
      <button onClick={() => handleDownload("json")}>Download JSON</button>
      <button onClick={() => handleDownload("pdf")}>Download PDF</button>
    </div>
  );
}
