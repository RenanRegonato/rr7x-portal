/**
 * Icons — SVG inline mínimo.
 * Cada export é um componente React que aceita { size, sw }.
 */
const Svg = ({ size = 16, sw = 1.5, children }) => (
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
);

export const IconHome       = (p) => <Svg {...p}><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/></Svg>;
export const IconPipeline   = (p) => <Svg {...p}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 6h6a4 4 0 0 1 4 4v0M16 12a4 4 0 0 1-4 4H8"/></Svg>;
export const IconSquad      = (p) => <Svg {...p}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M16 19c0-2 2-3 4-3"/></Svg>;
export const IconDoc        = (p) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4"/></Svg>;
export const IconSearch     = (p) => <Svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Svg>;
export const IconBell       = (p) => <Svg {...p}><path d="M6 9a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21a2 2 0 0 0 4 0"/></Svg>;
export const IconPlus       = (p) => <Svg {...p}><path d="M12 5v14 M5 12h14"/></Svg>;
export const IconFolder     = (p) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>;
export const IconArrowLeft  = (p) => <Svg {...p}><path d="M19 12H5 M12 19l-7-7 7-7"/></Svg>;
export const IconArrowRight = (p) => <Svg {...p}><path d="M5 12h14 M12 5l7 7-7 7"/></Svg>;
export const IconCheck      = (p) => <Svg {...p}><path d="M20 6L9 17l-5-5"/></Svg>;
export const IconClock      = (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>;
export const IconSparkle    = (p) => <Svg {...p}><path d="M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M5.6 18.4l2.8-2.8 M15.6 8.4l2.8-2.8"/></Svg>;
export const IconDownload   = (p) => <Svg {...p}><path d="M12 3v12 M7 10l5 5 5-5 M5 21h14"/></Svg>;
export const IconX          = (p) => <Svg {...p}><path d="M18 6L6 18 M6 6l12 12"/></Svg>;

// Lookup helper para casos onde precisamos do componente por nome (Sidebar, etc.)
export const ICONS_BY_NAME = {
  home: IconHome,
  pipeline: IconPipeline,
  squad: IconSquad,
  doc: IconDoc,
  search: IconSearch,
  bell: IconBell,
  plus: IconPlus,
  folder: IconFolder,
  arrowLeft: IconArrowLeft,
  arrowRight: IconArrowRight,
  check: IconCheck,
  clock: IconClock,
  sparkle: IconSparkle,
  download: IconDownload,
  x: IconX,
};
