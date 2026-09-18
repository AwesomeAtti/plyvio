/**
 * Settings Workspace — sections and object schemas. §3.4
 *
 * Section order is fixed by §3.4.4 and must not be reordered.
 *
 * `icon` is the section's leading glyph (§3.4.4, §7.4). It lives here rather
 * than in the component so that the order and the vocabulary are one list:
 * a section cannot be added without being given a glyph.
 */
import {
  GeneralIcon, AppearanceIcon, EngineIcon, Feed, DatabaseIcon, AboutIcon
} from '$lib/icons.js';

export const SECTIONS = [
  { id: 'general',       labelKey: 'settings.general',       kind: 'controls', icon: GeneralIcon    },
  { id: 'appearance',    labelKey: 'settings.appearance',    kind: 'controls', icon: AppearanceIcon },
  { id: 'engines',       labelKey: 'settings.engines',       kind: 'objects',  icon: EngineIcon     },
  { id: 'subscriptions', labelKey: 'settings.subscriptions', kind: 'objects',  icon: Feed           },
  { id: 'databases',     labelKey: 'settings.databases',     kind: 'objects',  icon: DatabaseIcon   },
  { id: 'about',         labelKey: 'settings.about',         kind: 'about',    icon: AboutIcon      }
];

export const DEFAULT_SECTION = 'general';   // §3.4.3

export function isSection(id) {
  return SECTIONS.some((s) => s.id === id);
}
export function sectionKind(id) {
  return SECTIONS.find((s) => s.id === id)?.kind ?? null;
}

/**
 * Object types for the three object-management sections. §3.4.8, §3.4.9
 *
 * `fields` drives the Detail/Edit View. Each field declares how it commits,
 * because auto-apply means there is no Save button to catch bad input:
 *
 *   commit: 'change'  select/toggle — commits immediately
 *   commit: 'blur'    text — commits on blur, never per keystroke, which
 *                     would apply half-typed values
 */
export const OBJECT_TYPES = {
  engines: {
    addKey: 'settings.addEngine',
    emptyKey: 'settings.emptyEngines',
    fields: [
      { id: 'binaryPath', labelKey: 'field.path', type: 'text',   commit: 'blur',   required: true },
      /* Stored as the schema stores it — megabytes, as a number. `MB` is added
         when it is drawn, not when it is kept. */
      { id: 'hashMb', labelKey: 'field.hash',    type: 'select', commit: 'change',
        options: [64, 128, 256, 512, 1024], format: (v) => `${v} MB` },
      { id: 'threads', labelKey: 'field.threads', type: 'select', commit: 'change',
        options: [1, 2, 4, 8, 16] },
      { id: 'enabled', labelKey: 'field.enabled', type: 'toggle', commit: 'change' }
    ]
  },
  subscriptions: {
    addKey: 'settings.addSubscription',
    emptyKey: 'settings.emptySubscriptions',
    fields: [
      { id: 'url',      labelKey: 'field.url',      type: 'text',   commit: 'blur', required: true },
      { id: 'interval', labelKey: 'field.interval', type: 'select', commit: 'change',
        options: ['Hourly', 'Daily', 'Weekly', 'Manual'] },
      { id: 'enabled',  labelKey: 'field.enabled',  type: 'toggle', commit: 'change' }
    ]
  },
  databases: {
    addKey: 'settings.addDatabase',
    emptyKey: 'settings.emptyDatabases',
    fields: [
      { id: 'location', labelKey: 'field.location', type: 'text',   commit: 'blur', required: true },
      { id: 'format',   labelKey: 'field.format',   type: 'select', commit: 'change',
        options: ['PGN', 'SCID', 'Internal'] },
      { id: 'enabled',  labelKey: 'field.enabled',  type: 'toggle', commit: 'change' }
    ]
  }
};

/**
 * Validate one field's proposed value.
 * Auto-apply removes the Save button that would normally catch bad input, so
 * this runs before every commit. Returns null when valid, else a message key.
 */
export function validateField(field, value) {
  if (field.required) {
    const empty = value == null || String(value).trim() === '';
    if (empty) return 'validation.required';
  }
  return null;
}
