declare module 'motion/react' {
  // Minimal stub for motion to satisfy type checking in this repo.
  export const motion: any;
}

declare module 'lucide-react' {
  export const Github: any;
  export const ArrowRight: any;
  export const Waves: any;
  export const Calendar: any;
  export const ArrowLeft: any;
  export const CalendarDays: any;
  export const List: any;
  export const Search: any;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: any;
  }
}

