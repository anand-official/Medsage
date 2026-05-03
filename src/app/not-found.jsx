export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: '#0c0e1a',
      color: '#dde3f5',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <section style={{
        width: 'min(100%, 560px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: 36,
        textAlign: 'center',
        background: 'rgba(16,18,32,0.82)',
      }}>
        <p style={{ margin: '0 0 10px', color: '#818cf8', fontWeight: 800, letterSpacing: 1 }}>
          404
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 34, lineHeight: 1.1 }}>
          Page not found
        </h1>
        <p style={{ margin: '0 0 24px', color: '#9aa6bd', lineHeight: 1.6 }}>
          This route has not been migrated to the Next.js shell yet.
        </p>
        <a
          href="/signin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            padding: '0 18px',
            borderRadius: 12,
            background: '#6366f1',
            color: '#fff',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Sign in
        </a>
      </section>
    </main>
  );
}
