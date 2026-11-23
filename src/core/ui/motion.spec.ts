import { describe, expect, it } from 'vitest';

import { applyMotion, MOTION_ATTRIBUTE } from './motion';
import { useUiStore } from './ui.store';

describe('applyMotion', () => {
  it('expone la preferencia en el documento', () => {
    applyMotion('always');

    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('always');

    applyMotion('never');
    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('never');
  });

  it('vuelve a system sin dejar rastro de la preferencia anterior', () => {
    applyMotion('always');
    applyMotion('system');

    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('system');
  });
});

describe('useUiStore · motion', () => {
  it('por defecto respeta el sistema', () => {
    expect(useUiStore.getState().motion).toBe('system');
  });

  it('cambia y conserva la preferencia', () => {
    useUiStore.getState().setMotion('always');

    expect(useUiStore.getState().motion).toBe('always');

    useUiStore.getState().setMotion('system');
  });
});
