'use client';

import { Card } from '@sapience/ui/components/ui/card';
import { useWallets, usePrivy } from '@privy-io/react-auth';
import { AnimatePresence, motion } from 'framer-motion';
import { ChatHeader } from './chat/ChatHeader';
import { ChatMessages } from './chat/ChatMessages';
import { ChatInput } from './chat/ChatInput';
import { useChatConnection } from './chat/useChatConnection';
import { useDraggable } from './chat/useDraggable';
import { useChat } from '~/lib/context/ChatContext';

const ChatWidget = () => {
  const { isOpen, closeChat } = useChat();
  const { wallets } = useWallets();
  const { ready, authenticated, login } = usePrivy();
  const connectedWallet = wallets[0];
  const addressOverride =
    ready && authenticated ? connectedWallet?.address : undefined;

  const {
    state: { messages, pendingText, setPendingText, canChat, canType },
    actions: { sendMessage, loginNow },
  } = useChatConnection(isOpen, addressOverride);

  const handleLogin = () => {
    if (ready && !authenticated) {
      try {
        login();
        return;
      } catch {
        /* noop */
      }
    }
    loginNow();
  };

  const {
    refs: { containerRef, headerRef, closeBtnRef },
    position,
    handlers: { onHeaderMouseDown, onHeaderTouchStart },
  } = useDraggable();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          ref={containerRef}
          className={`fixed z-[60] origin-center ${position ? '' : 'bottom-4 right-4'}`}
          style={
            position ? { top: position.top, left: position.left } : undefined
          }
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          <Card className="w-80 shadow-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <ChatHeader
              onClose={closeChat}
              headerRef={headerRef as React.RefObject<HTMLDivElement>}
              closeBtnRef={closeBtnRef as React.RefObject<HTMLButtonElement>}
              onHeaderMouseDown={onHeaderMouseDown}
              onHeaderTouchStart={onHeaderTouchStart}
            />
            <ChatMessages messages={messages} showLoader={canChat} />
            <ChatInput
              value={pendingText}
              onChange={setPendingText}
              onSend={sendMessage}
              canChat={canChat}
              canType={canType}
              onLogin={handleLogin}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ChatWidget;
