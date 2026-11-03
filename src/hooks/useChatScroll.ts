import { useLayoutEffect, useRef, useState } from 'react';

export function useChatScroll(conversationId: string | null, changes: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const jump = () => {
    follow.current = true;
    const element = containerRef.current;
    if (element) element.scrollTop = element.scrollHeight;
    setShowJump(false);
  };
  useLayoutEffect(jump, [conversationId]);
  useLayoutEffect(() => {
    if (follow.current) jump();
    else setShowJump(true);
  }, changes);
  const onScroll = () => {
    const element = containerRef.current;
    if (!element) return;
    follow.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
    if (follow.current) setShowJump(false);
  };
  return { containerRef, onScroll, showJump, jump };
}
