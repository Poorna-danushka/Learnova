import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

export type NavIconProps = {
  color: string;
  size?: number;
  active?: boolean;
};

// ─── Home Icon ────────────────────────────────────────────────────────────────
export function HomeIcon({ color, size = 22, active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182L10.364 3.79c.961-.836 2.311-.836 3.272 0L21 10.182M5.25 8.75V19a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25V8.75"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? `${color}20` : 'none'}
      />
      {active && (
        <Path
          d="M9.75 21v-5.25a2.25 2.25 0 012.25-2.25v0a2.25 2.25 0 012.25 2.25V21"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

// ─── Modules Icon ─────────────────────────────────────────────────────────────
export function ModulesIcon({ color, size = 22, active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3.5"
        width="8"
        height="8"
        rx="2.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? color : 'none'}
      />
      <Rect
        x="13"
        y="3.5"
        width="8"
        height="8"
        rx="2.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? `${color}40` : 'none'}
      />
      <Rect
        x="3"
        y="13.5"
        width="8"
        height="8"
        rx="2.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? `${color}40` : 'none'}
      />
      <Rect
        x="13"
        y="13.5"
        width="8"
        height="8"
        rx="2.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? color : 'none'}
      />
    </Svg>
  );
}

// ─── Planner / Calendar Icon ─────────────────────────────────────────────────
export function PlannerIcon({ color, size = 22, active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3.5"
        y="4.5"
        width="17"
        height="16"
        rx="3.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? `${color}18` : 'none'}
      />
      <Path
        d="M3.5 9h17M8 2.5v3.5M16 2.5v3.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
      />
      <Circle cx="8" cy="13" r="1.2" fill={color} />
      <Circle cx="12" cy="13" r="1.2" fill={color} />
      <Circle cx="16" cy="13" r="1.2" fill={color} />
      <Circle cx="8" cy="16.5" r="1.2" fill={color} />
      <Circle cx="12" cy="16.5" r="1.2" fill={color} />
    </Svg>
  );
}

// ─── Notes Icon ───────────────────────────────────────────────────────────────
export function NotesIcon({ color, size = 22, active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? `${color}18` : 'none'}
      />
    </Svg>
  );
}

// ─── Profile Icon ─────────────────────────────────────────────────────────────
export function ProfileIcon({ color, size = 22, active = false }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="8"
        r="4.25"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        fill={active ? color : 'none'}
      />
      <Path
        d="M4.75 19.5c.847-3.2 3.824-5.5 7.25-5.5s6.403 2.3 7.25 5.5"
        stroke={color}
        strokeWidth={active ? 2.3 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
