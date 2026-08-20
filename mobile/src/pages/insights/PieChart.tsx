import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAppTheme} from '../../styles/theme';
import {CHART_COLORS} from '../../utility/constants';

interface PieDataPoint {
  name: string;
  value: number;
}

interface PieChartProps {
  data: PieDataPoint[];
  title?: string;
  onSelectionToggle?: () => void;
}

const CHART_SIZE = 200;
const OUTER_RADIUS = 80;
const INNER_RADIUS = 55;

const truncate = (str: string, n: number) =>
  str.length > n ? str.slice(0, n - 1) + '...' : str;

const PieChart: React.FC<PieChartProps> = ({
  data,
  title = 'Group Distribution',
  onSelectionToggle,
}) => {
  const theme = useAppTheme();

  const totalValue = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0),
    [data],
  );

  const slices = useMemo(() => {
    if (data.length === 0) return [];
    let currentAngle = -90;
    return data.map((item, index) => {
      const percentage = (item.value / totalValue) * 100;
      const angle = (item.value / totalValue) * 360;
      const startAngle = currentAngle;
      const midAngle = startAngle + angle / 2;
      currentAngle += angle;
      return {
        ...item,
        percentage,
        angle,
        startAngle,
        midAngle,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [data, totalValue]);

  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, {backgroundColor: theme.bgCard}]}>
        <Text style={[styles.chartTitle, {color: theme.textPrimary}]}>
          {title}
        </Text>
        <View style={styles.emptyChart}>
          <Icon name="pie-chart" size={32} color={theme.textLight} />
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            No data available for the selected filters
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.chartContainer, {backgroundColor: theme.bgCard}]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, {color: theme.textPrimary}]}>
          {title}
        </Text>
        {onSelectionToggle && (
          <Pressable onPress={onSelectionToggle} style={styles.tuneButton}>
            <Icon name="tune" size={20} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Pie visualization */}
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          {slices.map((slice, index) => {
            const startRad = (slice.startAngle * Math.PI) / 180;
            const endRad =
              ((slice.startAngle + slice.angle) * Math.PI) / 180;
            const midRad = (slice.midAngle * Math.PI) / 180;

            const labelRadius = OUTER_RADIUS + 20;
            const labelX =
              CHART_SIZE / 2 + Math.cos(midRad) * labelRadius;
            const labelY =
              CHART_SIZE / 2 + Math.sin(midRad) * labelRadius;

            return (
              <React.Fragment key={index}>
                {/* Slice segment rendered as a colored arc indicator */}
                <View
                  style={[
                    styles.sliceIndicator,
                    {
                      left: CHART_SIZE / 2 - 4,
                      top: CHART_SIZE / 2 - OUTER_RADIUS,
                      height: OUTER_RADIUS,
                      transform: [
                        {rotate: `${slice.startAngle + slice.angle / 2}deg`},
                        {translateY: -OUTER_RADIUS / 2},
                      ],
                      backgroundColor: slice.color,
                      width: Math.max(
                        8,
                        (slice.angle / 360) * (2 * Math.PI * OUTER_RADIUS) * 0.3,
                      ),
                    },
                  ]}
                />
              </React.Fragment>
            );
          })}

          {/* Center hole */}
          <View
            style={[
              styles.centerHole,
              {backgroundColor: theme.bgCard},
            ]}>
            <Text style={[styles.totalLabel, {color: theme.textMuted}]}>
              Total
            </Text>
            <Text style={[styles.totalValue, {color: theme.textPrimary}]}>
              ₹{Math.round(totalValue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Legend with values */}
      <View style={styles.legend}>
        {slices.map((slice, index) => (
          <View key={index} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View
                style={[styles.legendDot, {backgroundColor: slice.color}]}
              />
              <Text
                style={[styles.legendLabel, {color: theme.textPrimary}]}
                numberOfLines={1}>
                {truncate(slice.name, 20)}
              </Text>
            </View>
            <View style={styles.legendRight}>
              <Text
                style={[
                  styles.legendValue,
                  {color: theme.textSecondary},
                ]}>
                ₹{Math.round(slice.value)}
              </Text>
              <Text style={[styles.legendPercent, {color: theme.textMuted}]}>
                {slice.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {fontSize: 14, fontWeight: '600'},
  tuneButton: {padding: 4},
  pieContainer: {alignItems: 'center', marginVertical: 12},
  pieChart: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    borderRadius: CHART_SIZE / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  sliceIndicator: {
    position: 'absolute',
    borderRadius: 4,
  },
  centerHole: {
    position: 'absolute',
    width: INNER_RADIUS * 2,
    height: INNER_RADIUS * 2,
    borderRadius: INNER_RADIUS,
    left: CHART_SIZE / 2 - INNER_RADIUS,
    top: CHART_SIZE / 2 - INNER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {fontSize: 11},
  totalValue: {fontSize: 16, fontWeight: '700'},
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {fontSize: 14, textAlign: 'center'},
  legend: {marginTop: 8},
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  legendLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1},
  legendDot: {width: 10, height: 10, borderRadius: 5},
  legendLabel: {fontSize: 13, flex: 1},
  legendRight: {flexDirection: 'row', alignItems: 'center', gap: 8},
  legendValue: {fontSize: 13, fontWeight: '600'},
  legendPercent: {fontSize: 11, width: 40, textAlign: 'right'},
});

export default PieChart;
