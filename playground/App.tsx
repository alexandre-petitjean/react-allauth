// Consume the library exactly like an external consumer would: through the
// package name `react-allauth`, which the playground Vite config aliases to
// `../src/index.ts`. Editing `src/*` hot-reloads this view.
import * as reactAllauth from 'react-allauth'

export function App() {
  const exportNames = Object.keys(reactAllauth)

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>react-allauth playground</h1>
      <p>
        This app imports from <code>react-allauth</code> (aliased to{' '}
        <code>src/index.ts</code>). Add exports to the library and they will show
        up below via HMR.
      </p>
      <h2>Library exports ({exportNames.length})</h2>
      {exportNames.length === 0 ? (
        <p>
          <em>No exports yet — the public surface is currently empty.</em>
        </p>
      ) : (
        <ul>
          {exportNames.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
