import { RefObject, useEffect, useRef } from 'react';

export function useModalFocus(open: boolean, ref: RefObject<HTMLElement>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
    )).filter(element => element.offsetParent !== null);
    controls()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key === 'Tab') {
        const list = controls();
        const first = list[0], last = list[list.length - 1];
        if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [open, ref]);
}
