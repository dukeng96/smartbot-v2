"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getDocumentImageUrl } from "@/lib/api/documents-api"

interface DocumentMarkdownImageProps {
  src?: string
  alt?: string
  kbId: string
  docId: string
}

const IMAGE_PATH_REGEX = /^markdown\/([^/]+)\/images\/(.+)$/

export function DocumentMarkdownImage({ src, alt, kbId, docId }: DocumentMarkdownImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) return

    const match = src.match(IMAGE_PATH_REGEX)
    if (match) {
      const filename = match[2]
      getDocumentImageUrl(kbId, docId, filename)
        .then((res) => setImageUrl(res.url))
        .catch(() => setError(true))
    } else {
      setImageUrl(src)
    }
  }, [src, kbId, docId])

  if (error) {
    return (
      <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded text-sm">
        [Không thể tải hình ảnh: {alt || src}]
      </span>
    )
  }

  if (!imageUrl) {
    return (
      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-sm animate-pulse">
        Đang tải hình ảnh...
      </span>
    )
  }

  return (
    <Image
      src={imageUrl}
      alt={alt || "Document image"}
      width={600}
      height={400}
      className="max-w-full h-auto rounded"
      unoptimized
    />
  )
}
