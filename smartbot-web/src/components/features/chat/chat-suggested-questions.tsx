"use client"

interface ChatSuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
  primaryColor?: string
}

/** Clickable suggestion chips displayed below greeting message */
export function ChatSuggestedQuestions({
  questions,
  onSelect,
  primaryColor = "#6D28D9",
}: ChatSuggestedQuestionsProps) {
  if (!questions.length) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-opacity-10"
          style={{
            borderColor: primaryColor,
            color: primaryColor,
          }}
        >
          {q}
        </button>
      ))}
    </div>
  )
}
