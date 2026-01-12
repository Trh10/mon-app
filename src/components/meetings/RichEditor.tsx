"use client";
import { useEffect, useRef } from 'react';

declare global {
  interface Window { tinymce?: any }
}

export default function RichEditor({ value, onChange, readOnly }: { value: string; onChange?: (html: string) => void; readOnly?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorId = useRef(`rich-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    let destroyed = false;

    async function ensureTiny() {
      if (window.tinymce) return;
      const apiKey = process.env.NEXT_PUBLIC_TINYMCE_KEY || 'no-api-key';
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;
        s.referrerPolicy = 'origin';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('TinyMCE CDN load failed'));
        document.head.appendChild(s);
      });
    }

    async function init() {
      try {
        await ensureTiny();
        if (destroyed) return;
        const tinymce = window.tinymce;
        // Clean previous instance if hot reloaded
        try { tinymce.get(editorId)?.remove(); } catch {}
        tinymce.init({
          selector: `#${editorId}`,
          plugins: 'advlist autolink autosave lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
          toolbar: readOnly ? false : 'undo redo | styles | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | removeformat | code fullscreen',
          menubar: readOnly ? false : 'file edit view insert format tools table help',
          branding: false,
          height: 520,
          readonly: readOnly ? true : false,
          setup: (ed: any) => {
            ed.on('init', () => {
              if (value) ed.setContent(value);
            });
            if (!readOnly) {
              ed.on('change keyup undo redo', () => {
                onChange?.(ed.getContent());
              });
            }
          }
        });
      } catch (e) {
        // fallback: keep textarea visible
      }
    }

    init();
    return () => {
      destroyed = true;
      try { window.tinymce?.get(editorId)?.remove(); } catch {}
    };
  }, [editorId, readOnly]);

  // Fallback textarea visible if CDN fails
  return (
    <textarea id={editorId} ref={textareaRef} defaultValue={value} className="w-full h-[520px] border rounded p-2 bg-white text-gray-900" />
  );
}
