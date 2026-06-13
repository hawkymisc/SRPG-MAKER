export interface Command<T> {
  label: string;
  apply(state: T): T;
  revert(state: T): T;
}

export interface HistoryState<T> {
  past: Command<T>[];
  future: Command<T>[];
}

export function createHistory<T>(): HistoryState<T> {
  return { past: [], future: [] };
}

export function executeCommand<T>(history: HistoryState<T>, state: T, command: Command<T>): {
  history: HistoryState<T>;
  state: T;
} {
  return {
    history: {
      past: [...history.past, command],
      future: [],
    },
    state: command.apply(state),
  };
}

export function undo<T>(history: HistoryState<T>, state: T): { history: HistoryState<T>; state: T } | null {
  const command = history.past.at(-1);
  if (!command) return null;
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [command, ...history.future],
    },
    state: command.revert(state),
  };
}

export function redo<T>(history: HistoryState<T>, state: T): { history: HistoryState<T>; state: T } | null {
  const command = history.future[0];
  if (!command) return null;
  return {
    history: {
      past: [...history.past, command],
      future: history.future.slice(1),
    },
    state: command.apply(state),
  };
}
