"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyLogoAction } from "./company-logo-action";

// Scale a logo to fit a small box (preserve aspect), output PNG (keeps transparency).
function toLogo(file: File, maxW = 260, maxH = 76): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = URL.createObjectURL(file);
  });
}

export function CompanyBrand({ name, logoUrl, canEdit }: { name: string; logoUrl: string | null; canEdit: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    start(async () => {
      try {
        const dataUrl = await toLogo(file);
        const res = await setCompanyLogoAction(dataUrl);
        if (res.ok) router.refresh(); else alert(res.error);
      } catch (err) { alert(err instanceof Error ? err.message : "Upload failed."); }
    });
  }

  return (
    <div className="logo">
      {logoUrl ? (
        <img className="brand-img" src={logoUrl} alt={name} />
      ) : (
        <>
          <span className="mark">{(name?.[0] ?? "N").toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <div className="name">{name}</div>
            <div className="tag">AI-native HRIS</div>
          </div>
        </>
      )}
      {canEdit && (
        <button className="brand-edit" disabled={pending} title="Upload company logo" onClick={() => inputRef.current?.click()}>
          {pending ? "…" : logoUrl ? "✎" : "+ Logo"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
    </div>
  );
}
