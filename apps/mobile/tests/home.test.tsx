import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../src/app/index';

function textIn(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node];
  }
  if (Array.isArray(node)) {
    return node.flatMap(textIn);
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    return textIn((node as { children: unknown }).children);
  }
  return [];
}

describe('the home screen', () => {
  it('shows the word Emi', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Emi')).toBeTruthy();
  });

  it('shows nothing else', async () => {
    await render(<HomeScreen />);

    expect(textIn(screen.toJSON())).toEqual(['Emi']);
  });
});
