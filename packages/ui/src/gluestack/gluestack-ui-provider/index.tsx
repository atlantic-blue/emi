import React, { useEffect } from 'react';
import { View, ViewProps, Appearance, ColorSchemeName } from 'react-native';
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator';
import { ToastProvider } from '@gluestack-ui/core/toast/creator';

/** Which colour scheme the components draw in. Emi is drawn in light and asks for nothing else. */
export type ModeType = 'light' | 'dark' | 'system';

/**
 * The root the copied components expect above them. It holds the overlay and the toast layers, so
 * a component that opens either one has somewhere to put it.
 */
export function GluestackUIProvider({
  mode = 'system',
  ...props
}: {
  mode?: ModeType;
  children?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  useEffect(() => {
    Appearance.setColorScheme(mode as ColorSchemeName);
  }, [mode]);

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%' }, props.style]}>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  );
}
