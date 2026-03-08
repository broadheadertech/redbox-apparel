"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AddressesPage() {
  const addresses = useQuery(api.storefront.addresses.getMyAddresses);
  const addAddress = useMutation(api.storefront.addresses.addAddress);
  const updateAddress = useMutation(api.storefront.addresses.updateAddress);
  const deleteAddress = useMutation(api.storefront.addresses.deleteAddress);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<Id<"customerAddresses"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    label: "Home",
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    isDefault: false,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ label: "Home", recipientName: "", phone: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "", isDefault: false });
    setShowDialog(true);
  };

  const openEdit = (addr: NonNullable<typeof addresses>[number]) => {
    setEditingId(addr._id);
    setForm({
      label: addr.label,
      recipientName: addr.recipientName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 ?? "",
      city: addr.city,
      province: addr.province,
      postalCode: addr.postalCode,
      isDefault: addr.isDefault,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.recipientName || !form.phone || !form.addressLine1 || !form.city || !form.province || !form.postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress({ addressId: editingId, ...form });
        toast.success("Address updated");
      } else {
        await addAddress(form);
        toast.success("Address added");
      }
      setShowDialog(false);
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Account
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold uppercase">Addresses</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      {addresses === undefined && (
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {addresses !== undefined && addresses.length === 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No addresses saved</p>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Add Address
          </Button>
        </div>
      )}

      {addresses && addresses.length > 0 && (
        <div className="mt-6 space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr._id}
              className={cn(
                "rounded-lg border p-4",
                addr.isDefault ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Star className="h-3 w-3" /> Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(addr)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteAddress({ addressId: addr._id });
                        toast.success("Address deleted");
                      } catch {
                        toast.error("Failed to delete");
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm font-medium">{addr.recipientName}</p>
              <p className="text-xs text-muted-foreground">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""},{" "}
                {addr.city}, {addr.province} {addr.postalCode}
              </p>
              <p className="text-xs text-muted-foreground">{addr.phone}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Add"} Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Home, Office, etc."
              />
            </div>
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div>
              <Label>Address Line 1 *</Label>
              <Input
                value={form.addressLine1}
                onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input
                value={form.addressLine2}
                onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Province *</Label>
                <Input
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Postal Code *</Label>
              <Input
                value={form.postalCode}
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded"
              />
              Set as default address
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
