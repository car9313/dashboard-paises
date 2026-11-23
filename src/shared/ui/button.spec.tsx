import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('renderiza un <button> con el estilo y el estado de carga', () => {
    render(<Button loading>Guardando</Button>);

    const button = screen.getByRole('button', { name: /guardando/i });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('con asChild renderiza el hijo y le inyecta el estilo', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/inicio">Volver</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: /volver/i });

    expect(link).toHaveAttribute('href', '/inicio');
    expect(link.className).toContain('bg-muted');
    // No debe existir un <button> envolvente.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('el disabled explícito gana sobre el estado de carga', () => {
    render(<Button disabled>Enviar</Button>);

    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });
});
