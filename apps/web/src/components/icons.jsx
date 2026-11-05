// Ikon aplikasi memakai Hugeicons (stroke 1,75, 16px, warna mengikuti teks).
// Nama ekspor dipertahankan dari set ikon sebelumnya agar pemanggil cukup mengganti baris import.
import { forwardRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  AddCircleIcon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowDownLeft01Icon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,
  ArrowUpRight01Icon,
  BankIcon,
  Calendar03Icon,
  CalendarCheckIn01Icon,
  Camera01Icon,
  Cancel01Icon,
  ChartColumnIcon,
  ChartDecreaseIcon,
  ChartIncreaseIcon,
  CheckmarkCircle02Icon,
  CircleIcon,
  Clock01Icon,
  Clock04Icon,
  ComputerIcon,
  Delete02Icon,
  Download04Icon,
  File02Icon,
  FileAttachmentIcon,
  FloppyDiskIcon,
  Home03Icon,
  Image01Icon,
  InformationCircleIcon,
  Invoice02Icon,
  LinkSquare02Icon,
  Invoice03Icon,
  Loading03Icon,
  Location01Icon,
  Logout03Icon,
  Menu01Icon,
  Money03Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  Mosque01Icon,
  Notification03Icon,
  PencilEdit02Icon,
  PlayCircleIcon,
  RefreshIcon,
  Search01Icon,
  SecurityCheckIcon,
  Settings02Icon,
  Share08Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  SmartPhone01Icon,
  SquareLock02Icon,
  TaskDone01Icon,
  Tick02Icon,
  Tv01Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
  UserIcon,
  Video01Icon,
  ViewIcon,
  ViewOffIcon,
  Wallet01Icon,
  Wallet03Icon,
  WorkHistoryIcon
} from '@hugeicons/core-free-icons';

function make(icon) {
  const Component = forwardRef(function Icon({ stroke = 1.75, size = 16, label, ...props }, ref) {
    return (
      <HugeiconsIcon
        ref={ref}
        data-slot="icon"
        icon={icon}
        size={size}
        strokeWidth={stroke}
        color="currentColor"
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        {...props}
      />
    );
  });
  return Component;
}

export const IconAdjustments = make(Settings02Icon);
export const IconArrowDown = make(ArrowDown02Icon);
export const IconArrowLeft = make(ArrowLeft02Icon);
export const IconArrowUp = make(ArrowUp02Icon);
export const IconArrowUpRight = make(ArrowUpRight01Icon);
export const IconBuildingBank = make(BankIcon);
export const IconBuildingMosque = make(Mosque01Icon);
export const IconCalendarEvent = make(Calendar03Icon);
export const IconCalendarStats = make(CalendarCheckIn01Icon);
export const IconCash = make(Money03Icon);
export const IconChartBar = make(ChartColumnIcon);
export const IconCheck = make(Tick02Icon);
export const IconChevronDown = make(ArrowDown01Icon);
export const IconChevronLeft = make(ArrowLeft01Icon);
export const IconChevronRight = make(ArrowRight01Icon);
export const IconChevronUp = make(ArrowUp01Icon);
export const IconCircleFilled = make(CircleIcon);
export const IconClipboardCheck = make(TaskDone01Icon);
export const IconClock = make(Clock01Icon);
export const IconClockHour4 = make(Clock04Icon);
export const IconDeviceFloppy = make(FloppyDiskIcon);
export const IconDeviceTv = make(Tv01Icon);
export const IconDots = make(MoreHorizontalIcon);
export const IconDotsVertical = make(MoreVerticalIcon);
export const IconDownload = make(Download04Icon);
export const IconEdit = make(PencilEdit02Icon);
export const IconEye = make(ViewIcon);
export const IconEyeOff = make(ViewOffIcon);
export const IconFile = make(File02Icon);
export const IconExternalLink = make(LinkSquare02Icon);
export const IconFileText = make(FileAttachmentIcon);
export const IconHistory = make(WorkHistoryIcon);
export const IconInfoCircle = make(InformationCircleIcon);
export const IconLayoutSidebarLeftCollapse = make(SidebarLeft01Icon);
export const IconLayoutSidebarLeftExpand = make(SidebarRight01Icon);
export const IconLoader = make(Loading03Icon);
export const IconLock = make(SquareLock02Icon);
export const IconLogout = make(Logout03Icon);
export const IconMapPin = make(Location01Icon);
export const IconMenu2 = make(Menu01Icon);
export const IconPencil = make(PencilEdit02Icon);
export const IconPhotoScan = make(Camera01Icon);
export const IconPlus = make(Add01Icon);
export const IconReceipt = make(Invoice03Icon);
export const IconRefresh = make(RefreshIcon);
export const IconScreenShare = make(ComputerIcon);
export const IconSearch = make(Search01Icon);
export const IconSelector = make(UnfoldMoreIcon);
export const IconShieldCheck = make(SecurityCheckIcon);
export const IconSmartHome = make(Home03Icon);
export const IconTrash = make(Delete02Icon);
export const IconTrendingDown = make(ChartDecreaseIcon);
export const IconTrendingUp = make(ChartIncreaseIcon);
export const IconUser = make(UserIcon);
export const IconUserCircle = make(UserCircleIcon);
export const IconVideo = make(Video01Icon);
export const IconWallet = make(Wallet01Icon);
export const IconX = make(Cancel01Icon);
export const IconBell = make(Notification03Icon);
export const IconCamera = make(Camera01Icon);
export const IconPhoto = make(Image01Icon);
export const IconDeviceMobile = make(SmartPhone01Icon);
export const IconShare = make(Share08Icon);
export const IconCirclePlus = make(AddCircleIcon);
export const IconAlertTriangle = make(Alert02Icon);
export const IconChecks = make(CheckmarkCircle02Icon);
export const IconDeviceDesktop = make(ComputerIcon);

// Nama yang dipakai Public Display (sebelumnya dari lucide-react).
export const ArrowDownLeft = make(ArrowDownLeft01Icon);
export const ArrowUpRight = make(ArrowUpRight01Icon);
export const Landmark = make(BankIcon);
export const MapPin = make(Location01Icon);
export const PlayCircle = make(PlayCircleIcon);
export const ReceiptText = make(Invoice02Icon);
export const WalletCards = make(Wallet03Icon);
