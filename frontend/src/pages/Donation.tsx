import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const RAZORPAY_LINK = "https://razorpay.me/your-link";

const Donation = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let formEl: HTMLFormElement | null = null;
    let scriptEl: HTMLScriptElement | null = null;
    if (open) {
      const placeholder = document.getElementById("razorpay-form-placeholder");
      if (placeholder) {
        formEl = document.createElement("form");
        scriptEl = document.createElement("script");
        scriptEl.src = "https://checkout.razorpay.com/v1/payment-button.js";
        scriptEl.setAttribute("data-payment_button_id", "pl_Sjh0RTRsVWhTDX");
        scriptEl.async = true;
        formEl.appendChild(scriptEl);
        placeholder.appendChild(formEl);
      }
    }

    return () => {
      try {
        if (formEl && formEl.parentNode) formEl.parentNode.removeChild(formEl);
      } catch {}
      formEl = null;
      scriptEl = null;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-4">Support this project</h1>
        <p className="text-muted-foreground mb-6">
          Donations help us keep the service running and improve reliability.
        </p>
        <Button onClick={() => setOpen(true)} className="bg-gradient-ember text-primary-foreground">Donate now</Button>
      </main>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 grid place-items-center p-4">
          <div className="w-full max-w-md rounded-xl bg-background ring-1 ring-border/60 p-5">
            <h3 className="text-xl font-semibold mb-2">Donation request</h3>
            <p className="text-sm text-muted-foreground mb-5">Please donate atleast 50rs for keeping site alive.</p>
            <div className="mb-4" id="razorpay-button-container" ref={null as any} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <div>
                {/* Razorpay form will be injected below when modal opens */}
                <div id="razorpay-form-placeholder" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Donation;
