'use client';

import { useState } from 'react';
import { useShareTask } from '@/entities/task';

type ShareButtonProps = {
  taskId: string;
};

export function ShareButton(props: ShareButtonProps) {
  const { taskId } = props;
  const { mutate, isPending } = useShareTask();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  function handleClick() {
    mutate(taskId, {
      onSuccess: (data) => {
        setCopiedUrl(data.url);
        navigator.clipboard.writeText(data.url).catch(() => {});
        setTimeout(() => setCopiedUrl(null), 3000);
      },
    });
  }

  if (copiedUrl) {
    return (
      <span className="task-list__share-copied" title={copiedUrl}>
        Link copied!
      </span>
    );
  }

  return (
    <button
      className="task-list__share"
      type="button"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? '…' : 'Share'}
    </button>
  );
}
