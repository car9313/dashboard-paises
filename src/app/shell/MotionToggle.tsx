import { Monitor, Sparkles, ZapOff } from 'lucide-react';
import { useEffect } from 'react';

import { applyMotion, type MotionMode } from '@/core/ui/motion';
import { useUiStore } from '@/core/ui/ui.store';
import { Button } from '@/shared/ui/button';

const NEXT_MOTION: Record<MotionMode, MotionMode> = {
  system: 'always',
  always: 'never',
  never: 'system'
};

const MOTION_LABEL: Record<MotionMode, string> = {
  system: 'Animaciones según el sistema',
  always: 'Animaciones siempre activas',
  never: 'Animaciones desactivadas'
};

const MOTION_HINT: Record<MotionMode, string> = {
  system: 'Se respeta la preferencia de tu sistema operativo',
  always: 'Se anima aunque el sistema pida reducir movimiento',
  never: 'Sin animaciones, aunque el sistema las permita'
};

const MOTION_ICON = { system: Monitor, always: Sparkles, never: ZapOff } as const;

/**
 * Conmutador de animaciones (sistema → siempre → nunca).
 *
 * @remarks
 * Existe porque Windows desactiva `prefers-reduced-motion` cuando alguien apaga
 * «Efectos de animación» del sistema, que es un ajuste de accesibilidad pensado
 * para otra cosa. Sin este control, esas personas no tienen forma de ver las
 * transiciones del dashboard salvo cambiando la configuración de todo Windows.
 *
 * El valor por defecto es `system`: la app es accesible sin configurar nada, y
 * quien quiera ver las animaciones lo pide explícitamente aquí.
 */
export function MotionToggle() {
  const motion = useUiStore((state) => state.motion);
  const setMotion = useUiStore((state) => state.setMotion);

  useEffect(() => {
    applyMotion(motion);
  }, [motion]);

  const Icon = MOTION_ICON[motion];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMotion(NEXT_MOTION[motion])}
      aria-label={`${MOTION_LABEL[motion]}. Cambiar animaciones`}
      title={`${MOTION_LABEL[motion]} — ${MOTION_HINT[motion]}`}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
