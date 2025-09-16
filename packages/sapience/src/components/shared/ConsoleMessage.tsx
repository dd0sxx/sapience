'use client';

import { useEffect } from 'react';

const ConsoleMessage = () => {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const message1 =
        'Our code is open source on GitHub https://github.com/sapiencexyz/sapience';
      const message2 =
        'Come chat with us on Discord https://discord.gg/sapience';
      const style =
        'font-size: 42px; font-weight: 900; padding: 8px 16px; color: #111827; background: linear-gradient(90deg,#FDE68A,#FCA5A5,#A78BFA,#93C5FD); border-radius: 8px;';

      console.log('%c' + message1, style);

      console.log('%c' + message2, style);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return null;
};

export default ConsoleMessage;
