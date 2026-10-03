export default function Crumb({ pid, opl, onRoot, onSet }) {
  return (
    <nav className="ins-crumb" aria-label="Location">
      <button type="button" onClick={onRoot}>
        Inspect
      </button>
      <span>/</span>
      {opl ? (
        <>
          <button type="button" onClick={onSet}>
            {pid}
          </button>
          <span>/</span>
          <b aria-current="page">{opl}</b>
        </>
      ) : (
        <b aria-current="page">{pid}</b>
      )}
    </nav>
  );
}
