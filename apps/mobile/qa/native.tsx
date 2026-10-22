import { forwardRef, useRef, type ComponentProps } from 'react';
import {
  Pressable as WebPressable,
  ScrollView as WebScrollView,
  FlatList as WebFlatList,
  SectionList as WebSectionList,
} from 'react-native-web';
export * from 'react-native-web';

// RN Web 0.21 lacks native accessibilityState and initial contentOffset support.
export const Pressable = forwardRef<
  HTMLElement,
  ComponentProps<typeof WebPressable> & {
    accessibilityState?: {
      selected?: boolean;
      disabled?: boolean;
      checked?: boolean;
      expanded?: boolean;
      busy?: boolean;
    };
  }
>(function Pressable({ accessibilityState: state, ...props }, ref) {
  return (
    <WebPressable
      {...props}
      ref={ref}
      aria-selected={state?.selected}
      aria-checked={state?.checked}
      aria-expanded={state?.expanded}
      aria-busy={state?.busy}
      disabled={props.disabled || state?.disabled}
    />
  );
});
export const ScrollView = forwardRef<
  WebScrollView,
  ComponentProps<typeof WebScrollView> & { contentOffset?: { x: number; y: number } }
>(function ScrollView({ contentOffset, onLayout, onContentSizeChange, ...props }, ref) {
  const view = useRef<WebScrollView>(null);
  const initial = useRef(contentOffset ?? { x: 0, y: 0 }).current;
  const restored = useRef(false);
  const restore = () => {
    const node = view.current?.getScrollableNode();
    if (restored.current || !node) return;
    if (initial.x > 0 && node.scrollWidth <= node.clientWidth) return;
    if (initial.y > 0 && node.scrollHeight <= node.clientHeight) return;
    restored.current = true;
    view.current?.scrollTo({ x: initial.x, y: initial.y, animated: false });
  };
  return (
    <WebScrollView
      {...props}
      ref={(value) => {
        view.current = value;
        if (typeof ref === 'function') ref(value);
        else if (ref) ref.current = value;
      }}
      onLayout={(event) => {
        onLayout?.(event);
        restore();
      }}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);
        restore();
      }}
    />
  );
});
export const FlatList = forwardRef<WebFlatList, ComponentProps<typeof WebFlatList>>(
  function FlatList(props, ref) {
    return (
      <WebFlatList
        {...props}
        ref={ref}
        renderScrollComponent={(props) => <ScrollView {...props} />}
      />
    );
  },
);
export const SectionList = forwardRef<WebSectionList, ComponentProps<typeof WebSectionList>>(
  function SectionList(props, ref) {
    return (
      <WebSectionList
        {...props}
        ref={ref}
        renderScrollComponent={(props) => <ScrollView {...props} />}
      />
    );
  },
);
