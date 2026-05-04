import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import CanvasParticles from './CanvasParticles';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('renders safely when canvas 2d context is unavailable', async () => {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = jest.fn(() => null);

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<CanvasParticles />);
  });

  expect(container.querySelector('canvas')).not.toBeNull();

  await act(async () => {
    root.unmount();
  });

  HTMLCanvasElement.prototype.getContext = originalGetContext;
  container.remove();
});
