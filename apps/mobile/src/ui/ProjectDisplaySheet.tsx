import { Pressable, ScrollView, Switch, Text, View, useWindowDimensions } from 'react-native';
import { issueProperties, type ProjectDisplay, type ProjectLayout } from '@/lib/project-display';
import type { IssueGrouping, IssueSort } from '@/lib/issue-list';
import { NativeSheet, Choices } from './work-controls';
import { useColors } from './theme';

export const projectLayouts: { value: ProjectLayout; label: string }[] = [
  { value: 'board', label: 'Board' },
  { value: 'list', label: 'List' },
  { value: 'table', label: 'Table' },
  { value: 'calendar', label: 'Calendar' },
];

export function ProjectLayoutPicker({
  value,
  onChange,
}: {
  value: ProjectLayout;
  onChange: (value: ProjectLayout) => void;
}) {
  const colors = useColors();
  const { fontScale } = useWindowDimensions();
  const enlarged = fontScale >= 1.6;
  return (
    <ScrollView
      horizontal
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsHorizontalScrollIndicator={enlarged}
    >
      <View
        style={{
          flexDirection: 'row',
          flexGrow: 1,
          gap: 4,
          padding: 4,
          borderRadius: 12,
          backgroundColor: colors.accentSoft,
        }}
      >
        {projectLayouts.map((layout) => (
          <Pressable
            key={layout.value}
            accessibilityRole="button"
            accessibilityLabel={`${layout.label} view`}
            accessibilityState={{ selected: value === layout.value }}
            onPress={() => onChange(layout.value)}
            style={{
              minHeight: 44,
              minWidth: 44,
              flex: enlarged ? undefined : 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              paddingVertical: 8,
              borderRadius: 9,
              backgroundColor: value === layout.value ? colors.surface : 'transparent',
            }}
          >
            <Text
              style={{
                color: colors.ink,
                fontSize: 14,
                lineHeight: 20,
                fontWeight: value === layout.value ? '600' : '400',
              }}
            >
              {layout.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function ProjectDisplaySheet({
  state,
  onChange,
  onClose,
}: {
  state: ProjectDisplay;
  onChange: (patch: Partial<ProjectDisplay>) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <NativeSheet visible title="Display" onClose={onClose}>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 20 }}>
        Display choices apply to this project on this device.
      </Text>
      {state.layout !== 'calendar' ? (
        <Choices<IssueSort>
          label="Sort by"
          value={state.sort}
          options={[
            { value: 'updated', label: 'Recently updated' },
            { value: 'due', label: 'Due date' },
            { value: 'priority', label: 'Priority' },
            { value: 'title', label: 'Title' },
          ]}
          onChange={(sort) => onChange({ sort })}
        />
      ) : null}
      {state.layout === 'board' || state.layout === 'list' ? (
        <Choices<IssueGrouping>
          label="Group by"
          value={state.grouping}
          options={[
            { value: 'none', label: 'No grouping' },
            { value: 'state', label: 'Status' },
            { value: 'priority', label: 'Priority' },
            { value: 'assignee', label: 'Assignee' },
          ]}
          onChange={(grouping) => onChange({ grouping })}
        />
      ) : null}
      {state.layout === 'board' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            minHeight: 56,
            marginBottom: 20,
          }}
        >
          <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }}>Show empty columns</Text>
          <Switch
            accessibilityLabel="Show empty columns"
            value={state.showEmptyGroups}
            onValueChange={(showEmptyGroups) => onChange({ showEmptyGroups })}
          />
        </View>
      ) : null}
      {state.layout === 'board' || state.layout === 'table' ? (
        <View style={{ gap: 4 }}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.ink, fontSize: 16, fontWeight: '600', marginBottom: 8 }}
          >
            Visible properties
          </Text>
          {issueProperties.map((property) => (
            <View
              key={property.value}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 16 }}
            >
              <Text style={{ flex: 1, color: colors.ink, fontSize: 16 }}>{property.label}</Text>
              <Switch
                accessibilityLabel={`Show ${property.label.toLowerCase()}`}
                value={state.properties.includes(property.value)}
                onValueChange={(enabled) =>
                  onChange({
                    properties: enabled
                      ? issueProperties
                          .map((item) => item.value)
                          .filter(
                            (item) => item === property.value || state.properties.includes(item),
                          )
                      : state.properties.filter((item) => item !== property.value),
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : null}
      {state.layout === 'calendar' ? (
        <>
          <Choices<'dueDate' | 'startDate'>
            label="Place issues by"
            value={state.calendarDate}
            options={[
              { value: 'dueDate', label: 'Due date' },
              { value: 'startDate', label: 'Start date' },
            ]}
            onChange={(calendarDate) => onChange({ calendarDate })}
          />
          <Choices<0 | 1>
            label="Week starts on"
            value={state.weekStart}
            options={[
              { value: 0, label: 'Sunday' },
              { value: 1, label: 'Monday' },
            ]}
            onChange={(weekStart) => onChange({ weekStart })}
          />
        </>
      ) : null}
    </NativeSheet>
  );
}
