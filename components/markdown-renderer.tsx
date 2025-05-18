"use client"

import type React from "react"
import ReactMarkdown from "react-markdown"

interface MarkdownRendererProps {
  content: string
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return <ReactMarkdown className="prose prose-invert max-w-none">{content}</ReactMarkdown>
}

export default MarkdownRenderer
