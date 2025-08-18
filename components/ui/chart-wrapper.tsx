'use client';

import React from 'react';
import {
  ResponsiveContainer as RechartsResponsiveContainer,
  PieChart as RechartsPieChart,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  AreaChart as RechartsAreaChart,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  Pie as RechartsPie,
  Bar as RechartsBar,
  Line as RechartsLine,
  Area as RechartsArea,
  Cell as RechartsCell,
} from 'recharts';

// Type-safe wrappers for recharts components
export const ResponsiveContainer = RechartsResponsiveContainer as any;
export const PieChart = RechartsPieChart as any;
export const BarChart = RechartsBarChart as any;
export const LineChart = RechartsLineChart as any;
export const AreaChart = RechartsAreaChart as any;
export const XAxis = RechartsXAxis as any;
export const YAxis = RechartsYAxis as any;
export const CartesianGrid = RechartsCartesianGrid as any;
export const Tooltip = RechartsTooltip as any;
export const Legend = RechartsLegend as any;
export const Pie = RechartsPie as any;
export const Bar = RechartsBar as any;
export const Line = RechartsLine as any;
export const Area = RechartsArea as any;
export const Cell = RechartsCell as any;