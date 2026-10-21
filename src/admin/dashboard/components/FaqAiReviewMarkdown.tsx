import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function FaqAiReviewMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ children, ...props }) => (
          <a {...props} rel="noreferrer" target="_blank">
            {children}
          </a>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {source}
    </ReactMarkdown>
  )
}
