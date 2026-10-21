type FollowUpsProps = {
  questions: readonly string[];
  disabled: boolean;
  onAsk: (question: string) => void;
};

export function FollowUps({ questions, disabled, onAsk }: FollowUpsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onAsk(q)}
          className="border border-line px-3 py-1.5 text-left text-chat text-fg-muted transition-colors hover:border-fringe-b/60 hover:bg-fringe-b/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
