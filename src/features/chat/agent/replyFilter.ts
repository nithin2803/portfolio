import { FOLLOWUPS, NONE, OUT_OF_SCOPE, SOURCES } from './prompt';

const MARKER = /(^|\n)[ \t]*FOLLOWUPS[ \t]*:/i;
const SOURCES_LINE = /^SOURCES[ \t]*:/i;

export type Verdict = {
  // OUT_OF_SCOPE, or nothing at all
  refused: boolean;
  // the ids from the SOURCES line: [] for NONE, undefined if the model skipped the line
  sources?: string[];
  followUps: string[];
};

const ids = (list: string) =>
  list
    .split(/[,|]/)
    .map((id) => id.trim().replace(/^[[\]"'`]+|[[\]"'`.]+$/g, ''))
    .filter(Boolean);

// streams the answer through, holding back the leading SOURCES line, an OUT_OF_SCOPE or SOURCES: NONE
// reply (neither may reach the visitor), and the trailing FOLLOWUPS line
export class ReplyFilter {
  private pending = '';
  private started = false;
  private closed = false;
  private tail = '';
  private sources?: string[];
  refused = false;

  constructor(private readonly emit: (text: string) => void) {}

  push(delta: string) {
    if (this.closed) {
      this.tail += delta;
      return;
    }
    this.pending += delta;
    this.flush(false);
  }

  private flush(final: boolean) {
    if (!this.started) {
      let head = this.pending.trimStart();
      if (!this.sources) {
        const label = head.match(SOURCES_LINE)?.[0];
        if (label) {
          const end = head.indexOf('\n');
          if (end < 0 && !final) return;
          const line = head.slice(label.length, end < 0 ? undefined : end);
          const cited = ids(line);
          this.sources = cited.some((id) => id.toUpperCase() === NONE) ? [] : cited;
          head = end < 0 ? '' : head.slice(end + 1).trimStart();
          if (!this.sources.length) {
            this.closed = true;
            this.pending = '';
            return;
          }
        } else if (!final && (!head || SOURCES.startsWith(head.toUpperCase().replace(/[ \t]+/g, '')))) {
          return;
        }
      }
      this.pending = head;
      if (head.startsWith(OUT_OF_SCOPE)) {
        this.refused = this.closed = true;
        this.pending = '';
        return;
      }
      if (!head || (!final && OUT_OF_SCOPE.startsWith(head))) return;
      this.started = true;
    }
    const marker = this.pending.search(MARKER);
    if (marker >= 0) {
      this.out(this.pending.slice(0, marker));
      this.tail = this.pending.slice(marker);
      this.pending = '';
      this.closed = true;
      return;
    }
    const lineStart = this.pending.lastIndexOf('\n') + 1;
    const line = this.pending.slice(lineStart).trimStart().toUpperCase();
    if (!final && line && FOLLOWUPS.startsWith(line)) {
      this.out(this.pending.slice(0, lineStart));
      this.pending = this.pending.slice(lineStart);
      return;
    }
    this.out(this.pending);
    this.pending = '';
  }

  private out(text: string) {
    if (text) this.emit(text);
  }

  finish(): Verdict {
    if (!this.closed) this.flush(true);
    const unanswered = this.sources?.length === 0;
    return {
      refused: this.refused || (!this.started && !unanswered),
      sources: this.sources,
      followUps: ids(this.tail.replace(MARKER, '')).slice(0, 3),
    };
  }
}
