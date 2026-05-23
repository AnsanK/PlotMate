import { getDataset } from '@/lib/server/dataset';

export default function Home() {
  const ds = getDataset();
  const firstMsr = ds.msrItems[0];
  const firstChip = ds.chips[0];

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 13,
        lineHeight: 1.5,
        background: '#ffffff',
        color: '#18181b',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>
        PlotMate · data load test
      </h1>
      <p>chips loaded: <strong>{ds.chips.length}</strong> (expected 18)</p>
      <p>msrItems loaded: <strong>{ds.msrItems.length}</strong> (expected 20)</p>
      <h2 style={{ fontSize: 14, marginTop: 16 }}>First chip</h2>
      <pre style={{ background: '#f4f4f5', padding: 12, borderRadius: 6 }}>
        {JSON.stringify(firstChip, null, 2)}
      </pre>
      <h2 style={{ fontSize: 14, marginTop: 16 }}>
        Top-priority MSR item (Priority 1)
      </h2>
      <pre style={{ background: '#f4f4f5', padding: 12, borderRadius: 6 }}>
        {JSON.stringify(firstMsr, null, 2)}
      </pre>
    </main>
  );
}
