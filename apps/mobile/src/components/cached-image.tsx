import React from 'react';
import { Image as ExpoImage, ImageProps } from 'expo-image';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type CachedImageProps = Omit<ImageProps, 'source'> & {
  uri: string;
};

type CachedImageBackgroundProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: ImageProps['style'];
  children?: React.ReactNode;
};

function getOptimizedUri(uri: string): string {
  const isOptimizableApiImage =
    uri.includes('/api/') &&
    (
      uri.includes('/cover') ||
      uri.includes('/image')
    );

  if (!isOptimizableApiImage || /[?&]w=\d+/i.test(uri)) return uri;
  return `${uri}${uri.includes('?') ? '&' : '?'}w=720`;
}

export function CachedImage({ uri, ...props }: CachedImageProps) {
  return (
    <ExpoImage
      {...props}
      source={{ uri: getOptimizedUri(uri) }}
      cachePolicy="memory-disk"
      contentFit={props.contentFit ?? 'cover'}
      transition={props.transition ?? 180}
    />
  );
}

export function CachedImageBackground({
  uri,
  style,
  imageStyle,
  children,
}: CachedImageBackgroundProps) {
  return (
    <View style={[style, styles.background]}>
      <CachedImage
        uri={uri}
        style={[StyleSheet.absoluteFillObject, imageStyle]}
        contentFit="cover"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    overflow: 'hidden',
  },
});
