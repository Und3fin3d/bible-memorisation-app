import { useState } from "react";
import { AlertDialog, Dialog as DialogPrimitive, RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const fadeClass = "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
const overlayClass = `fixed inset-0 z-50 bg-black/45 ${fadeClass}`;
const panelClass = `surface overlay-shadow fixed z-50 outline-none duration-200 ${fadeClass}`;
const titleClass = "text-lg font-semibold text-foreground";
const sheetClass = "inset-x-0 bottom-0 max-h-[92dvh] rounded-b-none data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:max-h-[calc(100dvh-2rem)]";
const centredClass = "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] data-[state=open]:zoom-in-[0.98]";

const Dialog = DialogPrimitive.Root;
const RadioGroup = RadioGroupPrimitive.Root;

interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  sheetOnMobile?: boolean;
  showClose?: boolean;
}

function DialogContent({ className, children, sheetOnMobile = false, showClose = true, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClass} />
      <DialogPrimitive.Content className={cn(panelClass, "flex flex-col w-full", sheetOnMobile ? sheetClass : centredClass, className)} {...props}>
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn(titleClass, className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return <RadioGroupPrimitive.Item className={cn("choice-row group w-full text-left", className)} {...props} />;
}

function RadioMark() {
  return (
    <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center shrink-0 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground">
      <RadioGroupPrimitive.Indicator className="w-2 h-2 rounded-full bg-background" />
    </span>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  const [shown, setShown] = useState({ title, message });
  if (open && (shown.title !== title || shown.message !== message)) setShown({ title, message });

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClass} />
        <AlertDialog.Content className={`${panelClass} left-1/2 top-1/2 w-full max-w-[calc(100%-2rem)] sm:max-w-sm -translate-x-1/2 -translate-y-1/2 p-6 data-[state=open]:zoom-in-[0.98]`}>
          <AlertDialog.Title className={titleClass}>{shown.title}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground mt-2">{shown.message}</AlertDialog.Description>
          <div className="flex gap-2 justify-end mt-6">
            <AlertDialog.Cancel className="btn-muted px-4 py-2">Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onClick={onConfirm} className="btn-primary !bg-destructive !text-destructive-foreground hover:opacity-90 px-4 py-2">
              Delete
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export { Dialog, DialogContent, DialogTitle, DialogDescription, RadioGroup, RadioGroupItem, RadioMark, ConfirmDialog };
