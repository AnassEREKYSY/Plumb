"use client";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteSetupAction, saveSetupAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Setup } from "@/lib/types";

const COLORS = ["#2F6B4F", "#8C6A87", "#4B3350", "#A26C1F", "#5B7A99", "#9C5B5B"];

export function SetupEditor({ setup, trigger }: { setup?: Setup; trigger: "new" | "edit" }) {
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState(setup?.name ?? "");
  const [description, setDescription] = useState(setup?.description ?? "");
  const [checklist, setChecklist] = useState((setup?.checklist ?? []).join("\n"));
  const [color, setColor] = useState(setup?.color ?? COLORS[0]);

  const save = () =>
    start(async () => {
      const res = await saveSetupAction(
        { name, description: description || null, checklist: checklist.split("\n").map((s) => s.trim()).filter(Boolean), color },
        setup?.id,
      );
      if (res.ok) {
        toast(t("common.saved"));
        setOpen(false);
      } else toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
    });
  const remove = () => {
    if (!setup || !window.confirm(t("playbook.deleteConfirm"))) return;
    start(async () => {
      const res = await deleteSetupAction(setup.id);
      if (!res.ok) toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
    });
  };

  return (
    <>
      {trigger === "new" ? (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {t("playbook.add")}
        </Button>
      ) : (
        <button onClick={() => setOpen(true)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label={t("common.edit")}>
          <Pencil className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" className="rise w-full max-w-lg rounded-xl border border-line bg-surface shadow-float" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="font-display text-[1.2rem] text-ink">{setup ? setup.name : t("playbook.add")}</h2>
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2" aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <Field label={t("playbook.name")} htmlFor="s-name">
                <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
              <Field label={t("playbook.description")} htmlFor="s-desc">
                <Textarea id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </Field>
              <Field label={t("playbook.checklist")} htmlFor="s-check" hint={t("playbook.checklistHint")}>
                <Textarea id="s-check" value={checklist} onChange={(e) => setChecklist(e.target.value)} rows={4} />
              </Field>
              <div>
                <div className="mb-1.5 text-[12.5px] font-medium text-ink-2">{t("playbook.color")}</div>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={c} className={cn("size-7 rounded-full ring-offset-2 ring-offset-surface", color === c && "ring-2 ring-ink")} style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
              {setup ? (
                <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
                  <Trash2 className="size-3.5" />
                  {t("common.delete")}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={save} disabled={pending || !name.trim()}>
                  {pending ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
