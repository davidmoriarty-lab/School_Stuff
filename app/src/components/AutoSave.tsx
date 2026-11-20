"use client";

import { useRef, type ComponentProps } from "react";
import { inputClass } from "./ui";

type Action = (formData: FormData) => void | Promise<void>;

/** A text box that saves itself (via a server action) when you click away or press Enter. */
export function AutoSaveInput({
  action, fields, name, defaultValue, className = "", ...rest
}: { action: Action; fields: Record<string, string | number>; name: string; defaultValue: string } & Omit<ComponentProps<"input">, "name" | "defaultValue" | "action">) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="contents">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input
        {...rest}
        name={name}
        defaultValue={defaultValue}
        key={defaultValue}
        className={`${inputClass} ${className}`}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== defaultValue) form.current?.requestSubmit(); }}
      />
    </form>
  );
}

/** A dropdown that saves itself as soon as you pick an option. */
export function AutoSaveSelect({
  action, fields, name, defaultValue, className = "", children,
}: { action: Action; fields: Record<string, string | number>; name: string; defaultValue: string | number; className?: string; children: React.ReactNode }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={action} className="contents">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <select
        name={name}
        defaultValue={defaultValue}
        key={String(defaultValue)}
        className={`${inputClass} pr-8 ${className}`}
        onChange={() => form.current?.requestSubmit()}
      >
        {children}
      </select>
    </form>
  );
}

/** Like AutoSaveInput, but it grows taller as the text gets longer, so nothing is ever cut off. Enter saves. */
export function AutoSaveText({
  action, fields, name, defaultValue, className = "", ...rest
}: { action: Action; fields: Record<string, string | number>; name: string; defaultValue: string } & Omit<ComponentProps<"textarea">, "name" | "defaultValue" | "action">) {
  const form = useRef<HTMLFormElement>(null);
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    // scrollHeight leaves out the border, which the box-sizing includes, so add it back
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  };
  return (
    <form ref={form} action={action} className="contents">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <textarea
        {...rest}
        name={name}
        defaultValue={defaultValue}
        key={defaultValue}
        rows={1}
        ref={(el) => { if (el) grow(el); }}
        onInput={(e) => grow(e.currentTarget)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        onBlur={(e) => { if (e.currentTarget.value.trim() !== defaultValue) form.current?.requestSubmit(); }}
        className={`${inputClass} resize-none overflow-hidden ${className}`}
      />
    </form>
  );
}
