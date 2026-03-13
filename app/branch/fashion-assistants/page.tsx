"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { getErrorMessage, cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserCheck, Plus, Pencil, Power, PowerOff } from "lucide-react";

type FA = {
  _id: Id<"fashionAssistants">;
  name: string;
  employeeCode?: string;
  isActive: boolean;
  createdAt: number;
};

export default function FashionAssistantsPage() {
  const currentUser = useQuery(api.auth.users.getCurrentUser);
  const fashionAssistants = useQuery(api.pos.fashionAssistants.listAll);
  const createFA = useMutation(api.pos.fashionAssistants.create);
  const updateFA = useMutation(api.pos.fashionAssistants.update);
  const setActive = useMutation(api.pos.fashionAssistants.setActive);

  // Add/edit dialog state
  const [editTarget, setEditTarget] = useState<FA | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [saving, setSaving] = useState(false);

  // Deactivate confirm
  const [toggleTarget, setToggleTarget] = useState<FA | null>(null);

  const isManager = currentUser?.role === "admin" || currentUser?.role === "manager";

  function openAdd() {
    setEditTarget(null);
    setFormName("");
    setFormCode("");
    setShowForm(true);
  }

  function openEdit(fa: FA) {
    setEditTarget(fa);
    setFormName(fa.name);
    setFormCode(fa.employeeCode ?? "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateFA({ id: editTarget._id, name: formName.trim(), employeeCode: formCode.trim() || undefined });
        toast.success("Fashion assistant updated");
      } else {
        await createFA({ name: formName.trim(), employeeCode: formCode.trim() || undefined });
        toast.success("Fashion assistant added");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    try {
      await setActive({ id: toggleTarget._id, isActive: !toggleTarget.isActive });
      toast.success(toggleTarget.isActive ? "Deactivated" : "Reactivated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setToggleTarget(null);
    }
  }

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <UserCheck className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Only managers can manage fashion assistants.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Fashion Assistants</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage floor staff who assist customers. Selected at POS for incentive tracking.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Assistant
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        {fashionAssistants === undefined ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : fashionAssistants.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
            <UserCheck className="h-10 w-10" />
            <p>No fashion assistants yet. Add one to start tracking.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Employee Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fashionAssistants.map((fa) => (
                <TableRow key={String(fa._id)} className={cn(!fa.isActive && "opacity-50")}>
                  <TableCell className="font-medium">{fa.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {fa.employeeCode ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        fa.isActive
                          ? "text-green-600 border-green-500/30 bg-green-500/10"
                          : "text-gray-400 border-gray-300"
                      )}
                    >
                      {fa.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(fa.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(fa as FA)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          fa.isActive ? "text-destructive hover:text-destructive" : "text-green-600 hover:text-green-600"
                        )}
                        onClick={() => setToggleTarget(fa as FA)}
                        title={fa.isActive ? "Deactivate" : "Reactivate"}
                      >
                        {fa.isActive
                          ? <PowerOff className="h-3.5 w-3.5" />
                          : <Power className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Fashion Assistant" : "Add Fashion Assistant"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Maria Santos"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
            <div className="space-y-2">
              <Label>Employee Code <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. FA-001"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formName.trim() || saving}>
              {saving ? "Saving..." : editTarget ? "Save Changes" : "Add Assistant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Reactivate confirm */}
      <Dialog open={!!toggleTarget} onOpenChange={(open: boolean) => { if (!open) setToggleTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {toggleTarget?.isActive ? "Deactivate" : "Reactivate"} {toggleTarget?.name}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {toggleTarget?.isActive
              ? "This assistant will no longer appear in the POS selector."
              : "This assistant will appear again in the POS selector."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button
              variant={toggleTarget?.isActive ? "destructive" : "default"}
              onClick={handleToggleActive}
            >
              {toggleTarget?.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
