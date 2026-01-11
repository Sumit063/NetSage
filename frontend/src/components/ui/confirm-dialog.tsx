import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  confirmDisabled?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  confirmDisabled
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[95vw] max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-card rounded-md shadow-lg">
          <div className="px-4 py-3 border-b border-border">
            <Dialog.Title className="text-sm font-semibold">{title}</Dialog.Title>
          </div>
          <div className="px-4 py-3 text-sm text-muted-foreground">
            {description || 'Are you sure you want to continue?'}
          </div>
          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">
                {cancelText}
              </Button>
            </Dialog.Close>
            <Button variant="destructive" size="sm" onClick={onConfirm} disabled={confirmDisabled}>
              {confirmText}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
