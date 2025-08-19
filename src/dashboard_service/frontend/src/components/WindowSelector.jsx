// frontend/src/components/WindowSelector.jsx
export default function WindowSelector({ totalWindows, user_id, batch_id }) {
  return (
    <div>
      <h4>Windows</h4>
      <ul>
        {Array.from({ length: totalWindows }).map((_, i) => (
          <li key={i}>
            <a href={`/details/${user_id}/${batch_id}/${i}`}>Window {i}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
