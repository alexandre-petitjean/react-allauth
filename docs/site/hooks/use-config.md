# useConfig

Fetch the one-shot allauth configuration: which login methods, providers and
signup fields the backend exposes. Useful to render the right UI without
hardcoding backend settings.

## Result

```ts
interface UseConfigResult {
  /** The allauth configuration, or null while loading or on error. */
  config: Config | null
  loading: boolean
  error: Error | null
  /** Refetch the configuration. */
  reload(): Promise<void>
}
```

## Example

```tsx
import { useConfig } from 'react-allauth'

function SocialButtons() {
  const { config, loading } = useConfig()
  if (loading) return null

  return (
    <>
      {config?.socialaccount?.providers.map((provider) => (
        <button key={provider.id}>{provider.name}</button>
      ))}
    </>
  )
}
```

## Notes

- The configuration is fetched on mount and does not depend on the session.
- Follows the data-hook convention: failures land in `error`, never a
  rejection from the initial load.
