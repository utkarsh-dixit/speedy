import React from 'react';
import { 
  Download as DownloadIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Trash2 as Trash2Icon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  Music as MusicIcon,
  Video as VideoIcon,
  FileText as FileTextIcon,
  FileArchive as FileArchiveIcon,
  Package as PackageIcon,
  Smartphone as SmartphoneIcon,
  Image as ImageIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Grid as GridIcon,
  List as ListIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Clock as ClockIcon,
  MoreVertical as MoreVerticalIcon,
  HardDrive as HardDriveIcon,
  X as XIcon,
  ArrowDown as ArrowDownIcon,
  ArrowUp as ArrowUpIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Minimize2 as Minimize2Icon,
  Maximize2 as Maximize2Icon,
  RotateCcw as RotateCcwIcon,
} from 'lucide-react';

export const Download = DownloadIcon;
export const Pause = PauseIcon;
export const Play = PlayIcon;
export const Trash2 = Trash2Icon;
export const Folder = FolderIcon;
export const Settings = SettingsIcon;
export const Music = MusicIcon;
export const Video = VideoIcon;
export const FileText = FileTextIcon;
export const FileArchive = FileArchiveIcon;
export const Package = PackageIcon;
export const Smartphone = SmartphoneIcon;
export const Image = ImageIcon;
export const ChevronDown = ChevronDownIcon;
export const ChevronUp = ChevronUpIcon;
export const Grid = GridIcon;
export const List = ListIcon;
export const Search = SearchIcon;
export const Check = CheckIcon;
export const Clock = ClockIcon;
export const MoreVertical = MoreVerticalIcon;
export const HardDrive = HardDriveIcon;
export const X = XIcon;
export const ArrowDown = ArrowDownIcon;
export const ArrowUp = ArrowUpIcon;
export const Wifi = WifiIcon;
export const WifiOff = WifiOffIcon;
export const Minimize2 = Minimize2Icon;
export const Maximize2 = Maximize2Icon;
export const RotateCcw = RotateCcwIcon;

export const getFileTypeIcon = (fileType: string) => {
  switch (fileType) {
    case 'audio':
      return Music;
    case 'video':
      return Video;
    case 'document':
      return FileText;
    case 'archive':
      return FileArchive;
    case 'program':
      return Package;
    case 'app':
      return Smartphone;
    case 'image':
      return Image;
    default:
      return FileText;
  }
};