'use client';

import { Input } from '@sapience/ui/components/ui/input';
import { Button } from '@sapience/ui/components/ui/button';

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  canChat: boolean;
  onLogin: () => void;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  canChat,
  onLogin,
}: Props) {
  return (
    <div className="p-3 border-t flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSend();
        }}
        disabled={!canChat}
      />
      <Button
        onClick={() => (canChat ? onSend() : onLogin())}
        disabled={canChat ? !value.trim() : false}
      >
        {canChat ? 'Send' : 'Log in'}
      </Button>
    </div>
  );
}
