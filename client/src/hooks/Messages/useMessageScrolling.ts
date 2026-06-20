import { useRecoilValue } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { useMessagesConversation, useMessagesSubmission } from '~/Providers';
import useScrollToRef from '~/hooks/useScrollToRef';
import store from '~/store';

const threshold = 0.85;
const debounceRate = 150;

export default function useMessageScrolling(messagesTree?: TMessage[] | null) {
  const autoScroll = useRecoilValue(store.autoScroll);

  const scrollableRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesStartRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const { conversation, conversationId } = useMessagesConversation();
  const { setAbortScroll, isSubmitting, abortScroll } = useMessagesSubmission();

  const timeoutIdRef = useRef<NodeJS.Timeout>();
  const topTimeoutIdRef = useRef<NodeJS.Timeout>();

  const debouncedSetShowScrollButton = useCallback((value: boolean) => {
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => {
      setShowScrollButton(value);
    }, debounceRate);
  }, []);

  const debouncedSetShowScrollTopButton = useCallback((value: boolean) => {
    clearTimeout(topTimeoutIdRef.current);
    topTimeoutIdRef.current = setTimeout(() => {
      setShowScrollTopButton(value);
    }, debounceRate);
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        debouncedSetShowScrollButton(!entry.isIntersecting);
      },
      { root: scrollableRef.current, threshold },
    );

    observer.observe(messagesEndRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutIdRef.current);
    };
  }, [messagesEndRef, scrollableRef, debouncedSetShowScrollButton]);

  useEffect(() => {
    if (!messagesStartRef.current || !scrollableRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        debouncedSetShowScrollTopButton(!entry.isIntersecting);
      },
      { root: scrollableRef.current, threshold: 0.1 },
    );

    observer.observe(messagesStartRef.current);

    return () => {
      observer.disconnect();
      clearTimeout(topTimeoutIdRef.current);
    };
  }, [messagesStartRef, scrollableRef, debouncedSetShowScrollTopButton]);

  const debouncedHandleScroll = useCallback(() => {
    if (messagesEndRef.current && scrollableRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          debouncedSetShowScrollButton(!entry.isIntersecting);
        },
        { root: scrollableRef.current, threshold },
      );
      observer.observe(messagesEndRef.current);
      return () => observer.disconnect();
    }
  }, [debouncedSetShowScrollButton]);

  const scrollCallback = () => debouncedSetShowScrollButton(false);
  const scrollTopCallback = () => debouncedSetShowScrollTopButton(false);

  const { handleSmoothToRef: handleSmoothToTop } = useScrollToRef({
    targetRef: messagesStartRef,
    callback: scrollTopCallback,
    smoothCallback: scrollTopCallback,
  });

  const { scrollToRef: scrollToBottom, handleSmoothToRef } = useScrollToRef({
    targetRef: messagesEndRef,
    callback: scrollCallback,
    smoothCallback: () => {
      scrollCallback();
      setAbortScroll(false);
    },
  });

  useEffect(() => {
    if (!messagesTree || messagesTree.length === 0) {
      return;
    }

    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    if (isSubmitting && scrollToBottom && abortScroll !== true) {
      scrollToBottom();
    }

    return () => {
      if (abortScroll === true) {
        scrollToBottom && scrollToBottom.cancel();
      }
    };
  }, [isSubmitting, messagesTree, scrollToBottom, abortScroll]);

  useEffect(() => {
    if (!messagesEndRef.current || !scrollableRef.current) {
      return;
    }

    if (scrollToBottom && autoScroll && conversationId !== Constants.NEW_CONVO) {
      scrollToBottom();
    }
  }, [autoScroll, conversationId, scrollToBottom]);

  return {
    conversation,
    scrollableRef,
    messagesEndRef,
    messagesStartRef,
    scrollToBottom,
    showScrollButton,
    showScrollTopButton,
    handleSmoothToRef,
    handleSmoothToTop,
    debouncedHandleScroll,
  };
}
