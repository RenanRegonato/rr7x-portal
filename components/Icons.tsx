'use client'

import { type SVGProps } from 'react'

function Svg({ size = 16, sw = 1.5, children }: { size?: number; sw?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

type IconProps = { size?: number; sw?: number }

export const IconHome       = (p: IconProps) => <Svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></Svg>
export const IconPipeline   = (p: IconProps) => <Svg {...p}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 6h6a4 4 0 0 1 4 4v0M16 12a4 4 0 0 1-4 4H8"/></Svg>
export const IconSquad      = (p: IconProps) => <Svg {...p}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 19c0-2 2-3 4-3"/></Svg>
export const IconDoc        = (p: IconProps) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4"/></Svg>
export const IconSearch     = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Svg>
export const IconBell       = (p: IconProps) => <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0"/></Svg>
export const IconPlus       = (p: IconProps) => <Svg {...p}><path d="M12 5v14 M5 12h14"/></Svg>
export const IconFolder     = (p: IconProps) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>
export const IconArrowLeft  = (p: IconProps) => <Svg {...p}><path d="M19 12H5 M12 19l-7-7 7-7"/></Svg>
export const IconArrowRight = (p: IconProps) => <Svg {...p}><path d="M5 12h14 M12 5l7 7-7 7"/></Svg>
export const IconCheck      = (p: IconProps) => <Svg {...p}><path d="M20 6L9 17l-5-5"/></Svg>
export const IconClock      = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>
export const IconSparkle    = (p: IconProps) => <Svg {...p}><path d="M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M5.6 18.4l2.8-2.8 M15.6 8.4l2.8-2.8"/></Svg>
export const IconDownload   = (p: IconProps) => <Svg {...p}><path d="M12 3v12 M7 10l5 5 5-5 M5 21h14"/></Svg>
export const IconX          = (p: IconProps) => <Svg {...p}><path d="M18 6L6 18 M6 6l12 12"/></Svg>
export const IconLogOut     = (p: IconProps) => <Svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/></Svg>
export const IconSettings   = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>
export const IconFileText   = (p: IconProps) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/></Svg>
export const IconTrash      = (p: IconProps) => <Svg {...p}><path d="M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6"/></Svg>
export const IconBuilding   = (p: IconProps) => <Svg {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4 M8 6h.01 M16 6h.01 M8 10h.01 M16 10h.01 M8 14h.01 M16 14h.01"/></Svg>
export const IconUsers      = (p: IconProps) => <Svg {...p}><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="2"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5 M16 19c0-2 2-3 4-3"/></Svg>
export const IconLock       = (p: IconProps) => <Svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Svg>
export const IconUser       = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></Svg>
export const IconHandshake  = (p: IconProps) => <Svg {...p}><path d="M11 17l2 2a1 1 0 1 0 3-3 M14 14l2.5 2.5a1 1 0 1 0 3-3L15 9 M14 14l-1.5-1.5a1 1 0 0 0-1.4 0L9 14.5a1 1 0 0 1-1.4 0L5.5 12.5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0L13 7l3.5-1.5a2 2 0 0 1 2 0L21 7 M3 12L7 8 M21 7l-3 3"/></Svg>

export const ICONS_BY_NAME: Record<string, (p: IconProps) => React.ReactElement> = {
  home:       IconHome,
  pipeline:   IconPipeline,
  squad:      IconSquad,
  doc:        IconDoc,
  search:     IconSearch,
  bell:       IconBell,
  plus:       IconPlus,
  folder:     IconFolder,
  arrowLeft:  IconArrowLeft,
  arrowRight: IconArrowRight,
  check:      IconCheck,
  clock:      IconClock,
  sparkle:    IconSparkle,
  download:   IconDownload,
  x:          IconX,
  logout:     IconLogOut,
  settings:   IconSettings,
  fileText:   IconFileText,
  building:   IconBuilding,
  users:      IconUsers,
  lock:       IconLock,
  user:       IconUser,
  handshake:  IconHandshake,
}
