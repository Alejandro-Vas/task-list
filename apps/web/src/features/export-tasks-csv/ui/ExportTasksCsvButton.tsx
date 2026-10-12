'use client';

import { useState, type MouseEvent } from 'react';
import { fetchTasksCsv } from '@/shared/api/tasks';

export function ExportTasksCsvButton() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const blob = await fetchTasksCsv();
      downloadBlob(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        className="export-csv__button"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Preparing…' : 'Export CSV'}
      </button>
      {error ? <p className="export-csv__error">{error}</p> : null}
    </>
  );
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
