'use client';

import { Input } from '@sapience/sdk/ui/components/ui/input';
import { Button } from '@sapience/sdk/ui/components/ui/button';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  canChat: boolean;
  canType: boolean;
  onLogin: () => void;
  sendDisabled?: boolean;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  canChat,
  canType,
  onLogin,
  sendDisabled,
}: Props) {
  const isDisabled =
    typeof sendDisabled === 'boolean'
      ? sendDisabled
      : canChat
        ? !value.trim()
        : false;
  const canAttemptSend = canChat && !isDisabled;
  return (
    <div className="p-3 border-t flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (canAttemptSend) onSend();
            else if (!canChat) onLogin();
          }
        }}
        disabled={!canType}
        placeholder={canChat ? 'Type a message...' : ''}
      />
      <Button
        onClick={() =>
          canAttemptSend ? onSend() : !canChat ? onLogin() : undefined
        }
        disabled={isDisabled}
      >
        {'Send'}
      </Button>
    </div>
  );
}
