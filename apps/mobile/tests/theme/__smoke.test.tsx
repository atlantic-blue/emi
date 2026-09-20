import { render, screen } from '@testing-library/react-native';
import { registerCSS } from 'react-native-css/jest';
import { Box } from '../../../../packages/ui/src/gluestack/box';

describe('smoke', () => {
  it('styles a gluestack box from a class', async () => {
    registerCSS('.h-16 { height: 64px; }', { inlineRem: 16 });
    await render(<Box className="h-16" testID="box" />);
    console.log('OK box', JSON.stringify(screen.getByTestId('box').props.style));
  });
});
