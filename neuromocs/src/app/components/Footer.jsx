export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <span style={styles.dot} />
          <span>Neuromocs</span>
        </div>

        <div style={styles.text}>
          <p>
            Built to support learning in <strong>Behavioral Neuroscience</strong> and
            <strong> Psychology in the Natural World</strong>.
          </p>
          <p style={styles.muted}>
            Designed for retrieval-based study and conceptual understanding.
          </p>
          <p style={styles.muted}>
            Educational use only — not medical or clinical guidance.
          </p>
        </div>

        <div style={styles.meta}>
          <span>Florida Southern College</span>
          <span>•</span>
          <span>Neuromocs © {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    marginTop: "auto",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(11,15,24,0.6)",
    backdropFilter: "blur(8px)",
  },
  inner: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px",
    display: "grid",
    gap: "12px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#c1002a", // FSC red accent
  },
  text: {
    fontSize: 14,
    lineHeight: 1.5,
  },
  muted: {
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  meta: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
  },
};
