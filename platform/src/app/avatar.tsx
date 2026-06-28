"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAvatarAction } from "./avatar-action";

const initials = (n: string) => n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

// Downscale + crop to a centered square and return a compact JPEG data URL.
function toThumbnail(file: File, size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = URL.createObjectURL(file);
  });
}

export function AvatarUpload({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    start(async () => {
      try {
        const dataUrl = await toThumbnail(file);
        const res = await setAvatarAction(dataUrl);
        if (res.ok) router.refresh(); else alert(res.error);
      } catch (err) { alert(err instanceof Error ? err.message : "Upload failed."); }
    });
  }

  return (
    <div className="profilechip">
      <button className="avatar-btn" title="Change profile photo" disabled={pending} onClick={() => inputRef.current?.click()}>
        {photoUrl ? <img src={photoUrl} alt={name} /> : <span className="avatar-fallback">{initials(name)}</span>}
        <span className="avatar-edit">{pending ? "…" : "✎"}</span>
      </button>
      <div className="profilechip-meta">
        <div className="profilechip-name">{name}</div>
        <button className="profilechip-link" disabled={pending} onClick={() => inputRef.current?.click()}>
          {photoUrl ? "Change photo" : "Add photo"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onPick} />
    </div>
  );
}
