"use client";

import { useLayoutEffect, useRef, type InputEvent, type TextareaHTMLAttributes } from "react";

type AutoGrowingTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & {
  value: string;
};

function fitTextareaToContent(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const borderHeight = textarea.offsetHeight - textarea.clientHeight;
  textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
}

export function AutoGrowingTextarea({
  value,
  onInput,
  ...props
}: AutoGrowingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) fitTextareaToContent(textareaRef.current);
  }, [value]);

  function handleInput(event: InputEvent<HTMLTextAreaElement>) {
    fitTextareaToContent(event.currentTarget);
    onInput?.(event);
  }

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      wrap="soft"
      onInput={handleInput}
    />
  );
}
