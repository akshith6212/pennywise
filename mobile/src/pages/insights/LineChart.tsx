import React, {useMemo} from 'react';
import {Dimensions, ScrollView, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAppTheme} from '../../styles/theme';
import {CHART_COLORS} from '../../utility/constants';

interface LineDataPoint {
  date: string;
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineDataPoint[];
  lineKeys: string[];
  title?: string;
}

const CHART_HEIGHT = 200;
const CHART_PADDING = 40;
const POINT_RADIUS = 3;

const truncate = (str: string, n: number) =>
  str.length > n ? str.slice(0, n - 1) + '...' : str;

const LineChart: React.FC<LineChartProps> = ({
  data,
  lineKeys,
  title = 'Spending Trends',
}) => {
  const theme = useAppTheme();
  const screenWidth = Dimensions.get('window').width - 32;

  const chartMetrics = useMemo(() => {
    if (data.length === 0) return null;

    let maxVal = 0;
    data.forEach(point => {
      lineKeys.forEach(key => {
        const val = Number(point[key]) || 0;
        if (val > maxVal) maxVal = val;
      });
    });

    maxVal = maxVal * 1.1 || 100;
    const chartWidth = Math.max(screenWidth - CHART_PADDING * 2, data.length * 50);

    return {maxVal, chartWidth};
  }, [data, lineKeys, screenWidth]);

  if (data.length === 0 || !chartMetrics) {
    return (
      <View style={[styles.chartContainer, {backgroundColor: theme.bgCard}]}>
        <Text style={[styles.chartTitle, {color: theme.textPrimary}]}>
          {title}
        </Text>
        <View style={styles.emptyChart}>
          <Icon name="show-chart" size={32} color={theme.textLight} />
          <Text style={[styles.emptyText, {color: theme.textMuted}]}>
            No data available for the selected filters
          </Text>
        </View>
      </View>
    );
  }

  const {maxVal, chartWidth} = chartMetrics;
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const yTicks = 5;
  const yLabels = Array.from({length: yTicks + 1}, (_, i) =>
    Math.round((maxVal / yTicks) * (yTicks - i)),
  );

  return (
    <View style={[styles.chartContainer, {backgroundColor: theme.bgCard}]}>
      <Text style={[styles.chartTitle, {color: theme.textPrimary}]}>
        {title}
      </Text>

      <View style={styles.chartBody}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {yLabels.map((label, i) => (
            <Text
              key={i}
              style={[styles.yLabel, {color: theme.textMuted}]}>
              ₹{label}
            </Text>
          ))}
        </View>

        {/* Chart area */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{width: chartWidth + 20, height: CHART_HEIGHT + 30}}>
            {/* Grid lines */}
            {yLabels.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    top: (i / yTicks) * CHART_HEIGHT,
                    backgroundColor: theme.borderColor,
                    width: chartWidth,
                  },
                ]}
              />
            ))}

            {/* Lines */}
            {lineKeys.map((key, keyIdx) => {
              const color = CHART_COLORS[keyIdx % CHART_COLORS.length];
              const points = data.map((point, idx) => {
                const val = Number(point[key]) || 0;
                const x = idx * stepX;
                const y = CHART_HEIGHT - (val / maxVal) * CHART_HEIGHT;
                return {x, y};
              });

              return (
                <React.Fragment key={key}>
                  {/* Line segments */}
                  {points.map((point, idx) => {
                    if (idx === 0) return null;
                    const prev = points[idx - 1];
                    const dx = point.x - prev.x;
                    const dy = point.y - prev.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                    return (
                      <View
                        key={`line-${key}-${idx}`}
                        style={[
                          styles.lineSegment,
                          {
                            left: prev.x,
                            top: prev.y,
                            width: length,
                            backgroundColor: color,
                            transform: [{rotate: `${angle}deg`}],
                          },
                        ]}
                      />
                    );
                  })}

                  {/* Points */}
                  {points.map((point, idx) => (
                    <View
                      key={`point-${key}-${idx}`}
                      style={[
                        styles.dataPoint,
                        {
                          left: point.x - POINT_RADIUS,
                          top: point.y - POINT_RADIUS,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  ))}
                </React.Fragment>
              );
            })}

            {/* X-axis labels */}
            <View style={[styles.xAxis, {top: CHART_HEIGHT + 4}]}>
              {data.map((point, idx) => {
                const showLabel =
                  data.length <= 10 || idx % Math.ceil(data.length / 8) === 0;
                if (!showLabel) return null;
                return (
                  <Text
                    key={idx}
                    style={[
                      styles.xLabel,
                      {left: idx * stepX - 15, color: theme.textMuted},
                    ]}>
                    {point.date}
                  </Text>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {lineKeys.map((key, idx) => (
          <View key={key} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]},
              ]}
            />
            <Text
              style={[styles.legendText, {color: theme.textSecondary}]}
              numberOfLines={1}>
              {truncate(key, 20)}
            </Text>
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
  chartTitle: {fontSize: 14, fontWeight: '600', marginBottom: 12},
  chartBody: {flexDirection: 'row'},
  yAxis: {
    width: 40,
    height: CHART_HEIGHT,
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  yLabel: {fontSize: 9, textAlign: 'right'},
  gridLine: {
    position: 'absolute',
    height: StyleSheet.hairlineWidth,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: POINT_RADIUS * 2,
    height: POINT_RADIUS * 2,
    borderRadius: POINT_RADIUS,
  },
  xAxis: {position: 'absolute', flexDirection: 'row'},
  xLabel: {position: 'absolute', fontSize: 9, width: 40},
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {fontSize: 14, textAlign: 'center'},
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: 4},
  legendDot: {width: 10, height: 10, borderRadius: 5},
  legendText: {fontSize: 11},
});

export default LineChart;
