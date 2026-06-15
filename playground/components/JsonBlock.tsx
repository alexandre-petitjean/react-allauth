import { Highlight, themes } from 'prism-react-renderer'

/** Pretty-print a value as syntax-highlighted JSON. */
export function JsonBlock({ value }: { value: unknown }) {
  const code = JSON.stringify(value, null, 2)

  return (
    <Highlight theme={themes.github} code={code} language="json">
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre className="json-block" style={style}>
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  )
}
