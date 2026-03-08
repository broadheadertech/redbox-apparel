"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { usePagination } from "@/lib/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Upload, ImageIcon,
} from "lucide-react";

const PLACEMENTS = [
  { value: "hero", label: "Hero Carousel" },
  { value: "promo", label: "Promo Banner" },
  { value: "flash_sale", label: "Flash Sale" },
  { value: "category", label: "Category Page" },
] as const;

type Placement = (typeof PLACEMENTS)[number]["value"];

export default function BannersPage() {
  const banners = useQuery(api.admin.banners.listBanners);
  const createBanner = useMutation(api.admin.banners.createBanner);
  const updateBanner = useMutation(api.admin.banners.updateBanner);
  const toggleStatus = useMutation(api.admin.banners.toggleBannerStatus);
  const deleteBanner = useMutation(api.admin.banners.deleteBanner);
  const replaceBannerImage = useMutation(api.admin.banners.replaceBannerImage);
  const generateUploadUrl = useMutation(api.catalog.images.generateUploadUrl);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<Id<"banners"> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Id<"banners"> | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState<Placement>("hero");
  const [sortOrder, setSortOrder] = useState(0);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Filter
  const [filterPlacement, setFilterPlacement] = useState<string>("all");

  const filteredBanners = (banners ?? []).filter(
    (b) => filterPlacement === "all" || b.placement === filterPlacement
  );
  const pagination = usePagination(filteredBanners);

  function openCreate() {
    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setLinkUrl("");
    setPlacement("hero");
    setSortOrder((banners?.length ?? 0) + 1);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowDialog(true);
  }

  function openEdit(bannerId: Id<"banners">) {
    const banner = banners?.find((b) => b._id === bannerId);
    if (!banner) return;
    setEditingId(bannerId);
    setTitle(banner.title);
    setSubtitle(banner.subtitle ?? "");
    setLinkUrl(banner.linkUrl ?? "");
    setPlacement(banner.placement as Placement);
    setSortOrder(banner.sortOrder);
    setSelectedFile(null);
    setPreviewUrl(banner.imageUrl);
    setShowDialog(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are allowed");
      return;
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadImage(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl();
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = await res.json();
    return storageId;
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!editingId && !selectedFile) {
      toast.error("Image is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update metadata
        await updateBanner({
          bannerId: editingId,
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          placement,
          sortOrder,
        });
        // Replace image if a new one was selected
        if (selectedFile) {
          const storageId = await uploadImage(selectedFile);
          await replaceBannerImage({ bannerId: editingId, newStorageId: storageId });
        }
        toast.success("Banner updated");
      } else {
        const storageId = await uploadImage(selectedFile!);
        await createBanner({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          imageStorageId: storageId,
          linkUrl: linkUrl.trim() || undefined,
          placement,
          sortOrder,
        });
        toast.success("Banner created");
      }
      setShowDialog(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(bannerId: Id<"banners">, isActive: boolean) {
    try {
      await toggleStatus({ bannerId, isActive: !isActive });
      toast.success(isActive ? "Banner deactivated" : "Banner activated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handleDelete(bannerId: Id<"banners">) {
    if (!confirm("Delete this banner? The image will also be removed.")) return;
    setDeleting(bannerId);
    try {
      await deleteBanner({ bannerId });
      toast.success("Banner deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Manage homepage hero carousel, promo, and flash sale banners
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Banner
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm">Placement:</Label>
        <Select value={filterPlacement} onValueChange={setFilterPlacement}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Placements</SelectItem>
            {PLACEMENTS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        {banners === undefined ? (
          <div className="p-8 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
            <ImageIcon className="h-10 w-10" />
            <p>No banners yet. Add your first banner.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Preview</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedData.map((banner) => (
                <TableRow key={banner._id}>
                  <TableCell>
                    {banner.imageUrl ? (
                      <div className="relative h-12 w-20 overflow-hidden rounded bg-muted">
                        <Image
                          src={banner.imageUrl}
                          alt={banner.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-20 items-center justify-center rounded bg-muted">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{banner.title}</p>
                    {banner.subtitle && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {banner.subtitle}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {banner.placement.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm">
                    {banner.sortOrder}
                  </TableCell>
                  <TableCell>
                    <Badge variant={banner.isActive ? "default" : "secondary"}>
                      {banner.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(banner._id)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggle(banner._id, banner.isActive)}
                        title={banner.isActive ? "Deactivate" : "Activate"}
                      >
                        {banner.isActive ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(banner._id)}
                        disabled={deleting === banner._id}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {filteredBanners.length > 0 && (
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
          onNextPage={pagination.nextPage}
          onPrevPage={pagination.prevPage}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Banner" : "Add Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Banner Image {!editingId && "*"}</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary hover:bg-muted/50"
              >
                {previewUrl ? (
                  <div className="relative h-32 w-full overflow-hidden rounded">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      sizes="400px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload (JPEG, PNG, WebP, max 5MB)
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Banner headline"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional description text"
              />
            </div>

            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="/browse or /search?q=shoes"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placement *</Label>
                <Select
                  value={placement}
                  onValueChange={(v) => setPlacement(v as Placement)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
