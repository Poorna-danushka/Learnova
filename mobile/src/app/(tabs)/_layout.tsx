import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';
import { HomeIcon, ModulesIcon, PlannerIcon, NotesIcon, ProfileIcon } from '@/components/NavIcons';

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',    label: 'Home',    IconComponent: HomeIcon },
  { name: 'modules',  label: 'Modules', IconComponent: ModulesIcon },
  { name: 'planning', label: 'Planner', IconComponent: PlannerIcon },
  { name: 'notes',    label: 'Notes',   IconComponent: NotesIcon },
  { name: 'profile',  label: 'Profile', IconComponent: ProfileIcon },
] as const;

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: {
  state: any;
  descriptors: any;
  navigation: any;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tb.barContainer,
        { paddingBottom: Math.max(insets.bottom, Spacing.xs) + 4 },
      ]}
    >
      <View style={tb.barInner}>
        {state.routes.map((route: any, index: number) => {
          const tab = TABS.find(t => t.name === route.name) ?? TABS[0];
          const isFocused = state.index === index;
          const { IconComponent } = tab;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isFocused }}
              style={({ pressed }) => [
                tb.item,
                pressed && !isFocused && { opacity: 0.75, transform: [{ scale: 0.95 }] },
              ]}
            >
              {/* Top accent pill indicator */}
              {isFocused && <View style={tb.activeTopBar} />}

              {/* Icon wrapper with glowing pill background when active */}
              <View style={[tb.iconWrap, isFocused && tb.iconWrapActive]}>
                <IconComponent
                  color={isFocused ? Colors.primaryLight : Colors.textMuted}
                  size={20}
                  active={isFocused}
                />
              </View>

              {/* Label */}
              <Text style={[tb.label, isFocused && tb.labelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home'    }} />
      <Tabs.Screen name="modules"  options={{ title: 'Modules' }} />
      <Tabs.Screen name="planning" options={{ title: 'Planner' }} />
      <Tabs.Screen name="notes"    options={{ title: 'Notes'   }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const tb = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
  },
  barInner: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius['2xl'],
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    ...Shadow.lg,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
    minHeight: 52,
  },
  iconWrap: {
    width: 42,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  iconWrapActive: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  label: {
    fontSize: 10,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: Colors.primaryLight,
    fontWeight: Typography.weight.black,
  },
  activeTopBar: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 3.5,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
  },
});
