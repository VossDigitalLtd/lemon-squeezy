// components/ui/index.ts

// ─── shadcn/ui components ────────────────────────────────────────────────────
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from './dropdown-menu';
export { Input } from './input';
export { PasswordInput } from './PasswordInput';
export { Progress } from './progress';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';
export { Switch } from './switch';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Textarea } from './textarea';

// ─── Custom components ───────────────────────────────────────────────────────
export { AppIcon } from './AppIcon';
export { AppLogo } from './AppLogo';
export { default as IconButton } from './IconButton';
export { default as LinkText } from './LinkText';
export { default as LoadingOverlay } from './LoadingOverlay';
export { default as Notice } from './Notice';
export { default as SelectableItem } from './SelectableItem';
export { default as Spinner, InlineLoader } from './Spinner';
export { default as Tip } from './Tip';
export { default as Toast } from './Toast';
export { default as ToastContainer } from './ToastContainer';

// ─── Type exports ─────────────────────────────────────────────────────────────
export type { ToastData, ToastType } from './Toast';
