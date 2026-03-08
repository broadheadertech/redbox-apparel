"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  MapPin,
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { formatPrice, cn } from "@/lib/utils";
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

const PAYMENT_METHODS = [
  { id: "cod" as const, label: "Cash on Delivery", icon: Banknote, desc: "Pay when you receive" },
  { id: "gcash" as const, label: "GCash", icon: Smartphone, desc: "Pay via GCash" },
  { id: "maya" as const, label: "Maya", icon: Smartphone, desc: "Pay via Maya" },
  { id: "card" as const, label: "Credit/Debit Card", icon: CreditCard, desc: "Visa, Mastercard" },
  { id: "bankTransfer" as const, label: "Bank Transfer", icon: CreditCard, desc: "Online banking" },
] as const;

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useQuery(api.storefront.cart.getMyCart);
  const addresses = useQuery(api.storefront.addresses.getMyAddresses);
  const createOrder = useMutation(api.storefront.orders.createOrder);
  const addAddress = useMutation(api.storefront.addresses.addAddress);

  const [selectedAddressId, setSelectedAddressId] = useState<Id<"customerAddresses"> | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<typeof PAYMENT_METHODS[number]["id"]>("cod");
  const [placing, setPlacing] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    recipientName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Auto-select default address
  if (addresses && addresses.length > 0 && !selectedAddressId) {
    const defaultAddr = addresses.find((a) => a.isDefault) ?? addresses[0];
    setSelectedAddressId(defaultAddr._id);
  }

  if (cart === undefined || addresses === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (cart === null || cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-medium">Your bag is empty</p>
        <Link href="/browse" className="text-sm text-primary hover:underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const shippingFee = cart.totalCentavos >= 99900 ? 0 : 9900;
  const total = cart.totalCentavos + shippingFee;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    setPlacing(true);
    try {
      const result = await createOrder({
        addressId: selectedAddressId,
        paymentMethod: selectedPayment,
      });
      toast.success(`Order ${result.orderNumber} placed!`);
      router.push(`/account/orders/${result.orderId}`);
    } catch (err: any) {
      toast.error(err.data?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.recipientName || !addressForm.phone || !addressForm.addressLine1 || !addressForm.city || !addressForm.province || !addressForm.postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSavingAddress(true);
    try {
      const id = await addAddress({
        ...addressForm,
        isDefault: addresses.length === 0,
      });
      setSelectedAddressId(id);
      setShowAddAddress(false);
      setAddressForm({ label: "Home", recipientName: "", phone: "", addressLine1: "", addressLine2: "", city: "", province: "", postalCode: "" });
      toast.success("Address saved");
    } catch {
      toast.error("Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bag
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold uppercase">Checkout</h1>

      {/* Step 1: Delivery Address */}
      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <MapPin className="h-4 w-4 text-primary" />
          Delivery Address
        </h2>

        <div className="mt-3 space-y-2">
          {addresses.map((addr) => (
            <button
              key={addr._id}
              onClick={() => setSelectedAddressId(addr._id)}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition-colors",
                selectedAddressId === addr._id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {addr.label}
                </span>
                {selectedAddressId === addr._id && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="mt-1 text-sm font-medium">{addr.recipientName}</p>
              <p className="text-xs text-muted-foreground">
                {addr.addressLine1}
                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""},{" "}
                {addr.city}, {addr.province} {addr.postalCode}
              </p>
              <p className="text-xs text-muted-foreground">{addr.phone}</p>
            </button>
          ))}

          <button
            onClick={() => setShowAddAddress(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add New Address
          </button>
        </div>
      </section>

      {/* Step 2: Payment Method */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
          <CreditCard className="h-4 w-4 text-primary" />
          Payment Method
        </h2>

        <div className="mt-3 space-y-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedPayment(method.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 transition-colors",
                selectedPayment === method.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground"
              )}
            >
              <method.icon className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <p className="text-sm font-medium">{method.label}</p>
                <p className="text-xs text-muted-foreground">{method.desc}</p>
              </div>
              {selectedPayment === method.id && (
                <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Step 3: Order Summary */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider">Order Summary</h2>
        <div className="mt-3 space-y-3">
          {cart.items.map((item) => (
            <div key={item._id} className="flex items-center gap-3">
              <div className="relative h-14 w-11 flex-shrink-0 overflow-hidden rounded bg-muted">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.styleName}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{item.styleName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.color} / {item.size} x{item.quantity}
                </p>
              </div>
              <span className="font-mono text-sm font-medium">
                {formatPrice(item.lineTotalCentavos)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(cart.totalCentavos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shippingFee === 0 ? "FREE" : formatPrice(shippingFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
            <span>Total</span>
            <span className="font-mono text-primary">{formatPrice(total)}</span>
          </div>
        </div>
      </section>

      {/* Place Order */}
      <button
        onClick={handlePlaceOrder}
        disabled={placing || !selectedAddressId}
        className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {placing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Placing Order...
          </>
        ) : (
          `Place Order — ${formatPrice(total)}`
        )}
      </button>

      {/* Add Address Dialog */}
      <Dialog open={showAddAddress} onOpenChange={setShowAddAddress}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Delivery Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Label</Label>
              <Input
                value={addressForm.label}
                onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Home, Office, etc."
              />
            </div>
            <div>
              <Label>Recipient Name *</Label>
              <Input
                value={addressForm.recipientName}
                onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={addressForm.phone}
                onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="09XX XXX XXXX"
              />
            </div>
            <div>
              <Label>Address Line 1 *</Label>
              <Input
                value={addressForm.addressLine1}
                onChange={(e) => setAddressForm((f) => ({ ...f, addressLine1: e.target.value }))}
                placeholder="Street, Building, Unit"
              />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <Input
                value={addressForm.addressLine2}
                onChange={(e) => setAddressForm((f) => ({ ...f, addressLine2: e.target.value }))}
                placeholder="Barangay, Subdivision"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Makati"
                />
              </div>
              <div>
                <Label>Province *</Label>
                <Input
                  value={addressForm.province}
                  onChange={(e) => setAddressForm((f) => ({ ...f, province: e.target.value }))}
                  placeholder="Metro Manila"
                />
              </div>
            </div>
            <div>
              <Label>Postal Code *</Label>
              <Input
                value={addressForm.postalCode}
                onChange={(e) => setAddressForm((f) => ({ ...f, postalCode: e.target.value }))}
                placeholder="1234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAddress(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddress} disabled={savingAddress}>
              {savingAddress ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
