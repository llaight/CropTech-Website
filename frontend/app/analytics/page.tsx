"use client";

import React from "react";
import { useTheme } from "../components/ThemeProvider";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Droplets,
  Sun,
  Wind,
  Thermometer,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Package,
  Sprout,
  MapPin,
  TrendingUp as TrendingUpIcon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// Mock data aligned with CropTech specifications - will be replaced with backend data later
const mockData = {
  overview: {
    totalRevenue: 45230,
    revenueChange: 12.5,
    totalYield: 12450,
    yieldChange: 8.3,
    activeFields: 12,
    fieldsChange: 2,
    avgCropHealth: 87,
    healthChange: 5.2,
    profitEstimate: 28500,
    profitChange: 15.2,
  },
  // Rice variants performance (as per specification - focused on rice crops)
  riceVariants: [
    { name: "Jasmine Rice", yield: 3200, revenue: 12800, health: 92, area: 15, pricePerKg: 45, location: "Central Luzon", season: "Dry Season" },
    { name: "Sinandomeng", yield: 2800, revenue: 11200, health: 88, area: 12, pricePerKg: 42, location: "Central Luzon", season: "Wet Season" },
    { name: "IR64", yield: 2400, revenue: 9600, health: 85, area: 10, pricePerKg: 40, location: "Laguna", season: "Dry Season" },
    { name: "NSIC Rc222", yield: 1800, revenue: 7200, health: 90, area: 8, pricePerKg: 38, location: "Laguna", season: "Wet Season" },
    { name: "Dinorado", yield: 1500, revenue: 6000, health: 82, area: 6, pricePerKg: 50, location: "Mindanao", season: "Dry Season" },
  ],
  // Market price monitoring (real-time and historical)
  marketPrices: [
    { variant: "Jasmine Rice", currentPrice: 45, previousPrice: 42, change: 7.1, location: "Central Luzon", trend: "up" },
    { variant: "Sinandomeng", currentPrice: 42, previousPrice: 40, change: 5.0, location: "Central Luzon", trend: "up" },
    { variant: "IR64", currentPrice: 40, previousPrice: 38, change: 5.3, location: "Laguna", trend: "up" },
    { variant: "NSIC Rc222", currentPrice: 38, previousPrice: 37, change: 2.7, location: "Laguna", trend: "up" },
    { variant: "Dinorado", currentPrice: 50, previousPrice: 48, change: 4.2, location: "Mindanao", trend: "up" },
  ],
  // Historical sales data
  monthlySales: [
    { month: "Jan", sales: 3200, quantity: 850 },
    { month: "Feb", sales: 3800, quantity: 920 },
    { month: "Mar", sales: 4200, quantity: 980 },
    { month: "Apr", sales: 4500, quantity: 1050 },
    { month: "May", sales: 4800, quantity: 1120 },
    { month: "Jun", sales: 5200, quantity: 1180 },
    { month: "Jul", sales: 5600, quantity: 1250 },
    { month: "Aug", sales: 5800, quantity: 1280 },
    { month: "Sep", sales: 6200, quantity: 1350 },
    { month: "Oct", sales: 6500, quantity: 1420 },
    { month: "Nov", sales: 6800, quantity: 1480 },
    { month: "Dec", sales: 7100, quantity: 1550 },
  ],
  // Yield trends
  yieldTrends: [
    { period: "Q1 2024", yield: 2800, profit: 12000 },
    { period: "Q2 2024", yield: 3100, profit: 13500 },
    { period: "Q3 2024", yield: 2900, profit: 12800 },
    { period: "Q4 2024", yield: 3300, profit: 14500 },
    { period: "Q1 2025", yield: 3500, profit: 15200 },
  ],
  // High-performing crops by location
  topByLocation: [
    { location: "Central Luzon", variant: "Jasmine Rice", yield: 3200, revenue: 12800, performance: "Excellent" },
    { location: "Laguna", variant: "IR64", yield: 2400, revenue: 9600, performance: "Good" },
    { location: "Mindanao", variant: "Dinorado", yield: 1500, revenue: 6000, performance: "Fair" },
  ],
  // High-performing crops by season
  topBySeason: [
    { season: "Dry Season", variant: "Jasmine Rice", yield: 3200, revenue: 12800, performance: "Excellent" },
    { season: "Wet Season", variant: "Sinandomeng", yield: 2800, revenue: 11200, performance: "Good" },
  ],
  // Weather data (localized)
  weatherData: {
    temperature: 24,
    humidity: 68,
    rainfall: 12.5,
    windSpeed: 8.2,
    forecast: [
      { day: "Today", temp: 24, condition: "Sunny", icon: "☀️" },
      { day: "Tomorrow", temp: 26, condition: "Partly Cloudy", icon: "⛅" },
      { day: "Day 3", temp: 23, condition: "Light Rain", icon: "🌦️" },
      { day: "Day 4", temp: 25, condition: "Sunny", icon: "☀️" },
      { day: "Day 5", temp: 27, condition: "Clear", icon: "☀️" },
    ],
  },
  // Field distribution with rice variants
  fieldDistribution: [
    { name: "Field A", area: 25, variant: "Jasmine Rice", status: "Growing", location: "Central Luzon", marketPrice: 45 },
    { name: "Field B", area: 20, variant: "Sinandomeng", status: "Growing", location: "Central Luzon", marketPrice: 42 },
    { name: "Field C", area: 18, variant: "IR64", status: "Harvesting", location: "Laguna", marketPrice: 40 },
    { name: "Field D", area: 15, variant: "NSIC Rc222", status: "Growing", location: "Laguna", marketPrice: 38 },
    { name: "Field E", area: 12, variant: "Dinorado", status: "Planted", location: "Mindanao", marketPrice: 50 },
  ],
  // Actionable insights
  insights: [
    { type: "recommendation", message: "Jasmine Rice in Central Luzon shows excellent performance. Consider expanding area by 20% next season.", priority: "high" },
    { type: "alert", message: "Market price for Dinorado increased by 4.2%. Optimal time to harvest Field E.", priority: "medium" },
    { type: "info", message: "Yield trend shows 15% improvement in Q1 2025. Continue current farming practices.", priority: "low" },
  ],
};

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("month");
  const [viewMode, setViewMode] = useState<"location" | "season">("location");

  const isDark = theme === "dark";

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    iconColor,
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    iconColor: string;
  }) => (
    <div
      className={`${
        isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
      } rounded-2xl shadow-lg border p-6 hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${isDark ? "text-white" : "text-slate-700"}`} />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center text-sm font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-600"} mb-1`}>
        {title}
      </h3>
      <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
        {typeof value === "number" && title.includes("Revenue")
          ? `₱${value.toLocaleString()}`
          : typeof value === "number" && title.includes("Yield")
          ? `${value.toLocaleString()} kg`
          : typeof value === "number" && title.includes("Profit")
          ? `₱${value.toLocaleString()}`
          : value}
      </p>
    </div>
  );

  const maxSales = Math.max(...mockData.monthlySales.map((m) => m.sales));

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 via-white to-slate-100"}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"} mb-2`}>
              Analytics Dashboard
            </h1>
            <p className={`${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Performance reports, yield trends, profit estimates, and actionable insights for your rice farming operations
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 mb-6">
            {(["week", "month", "year"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPeriod === period
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                    : isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Revenue"
              value={mockData.overview.totalRevenue}
              change={mockData.overview.revenueChange}
              icon={DollarSign}
              iconColor="bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              title="Total Yield"
              value={mockData.overview.totalYield}
              change={mockData.overview.yieldChange}
              icon={Package}
              iconColor="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              title="Profit Estimate"
              value={mockData.overview.profitEstimate}
              change={mockData.overview.profitChange}
              icon={TrendingUpIcon}
              iconColor="bg-purple-100 dark:bg-purple-900/30"
            />
            <StatCard
              title="Avg Crop Health"
              value={`${mockData.overview.avgCropHealth}%`}
              change={mockData.overview.healthChange}
              icon={BarChart3}
              iconColor="bg-yellow-100 dark:bg-yellow-900/30"
            />
          </div>

          {/* Market Price Monitoring */}
          <div
            className={`${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            } rounded-2xl shadow-lg border p-6 mb-8`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Market Price Monitoring - Rice Variants
              </h2>
              <DollarSign className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockData.marketPrices.map((price, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {price.variant}
                    </h3>
                    {price.trend === "up" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-2xl font-bold ${isDark ? "text-green-400" : "text-green-600"}`}>
                      ₱{price.currentPrice}
                    </span>
                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                      /kg
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Previous: ₱{price.previousPrice}
                    </span>
                    <span className={`font-medium ${price.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {price.change >= 0 ? "+" : ""}{price.change}%
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {price.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts and Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Historical Sales Data */}
            <div
              className={`${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              } rounded-2xl shadow-lg border p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Historical Sales Data
                </h2>
                <BarChart3 className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
              </div>
              <div className="space-y-3">
                {mockData.monthlySales.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-12 text-sm font-medium text-slate-600 dark:text-slate-400">
                      {item.month}
                    </div>
                    <div className="flex-1 relative">
                      <div
                        className={`h-8 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-2`}
                        style={{ width: `${(item.sales / maxSales) * 100}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          ₱{(item.sales / 1000).toFixed(1)}k
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 w-16 text-right">
                      {item.quantity} kg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Yield Trends */}
            <div
              className={`${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              } rounded-2xl shadow-lg border p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Yield Trends & Profit Estimates
                </h2>
                <TrendingUpIcon className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
              </div>
              <div className="space-y-4">
                {mockData.yieldTrends.map((trend, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      isDark ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {trend.period}
                      </span>
                      <span className={`text-sm font-medium ${isDark ? "text-green-400" : "text-green-600"}`}>
                        ₱{trend.profit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                        Yield: <span className="font-medium">{trend.yield.toLocaleString()} kg</span>
                      </span>
                      <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                        Profit: <span className="font-medium text-green-600">₱{trend.profit.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* High-Performing Crops by Location/Season */}
          <div
            className={`${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            } rounded-2xl shadow-lg border p-6 mb-8`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                High-Performing Crops Analysis
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("location")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "location"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                      : isDark
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  By Location
                </button>
                <button
                  onClick={() => setViewMode("season")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    viewMode === "season"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                      : isDark
                      ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  By Season
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(viewMode === "location" ? mockData.topByLocation : mockData.topBySeason).map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {viewMode === "location" ? item.location : item.season}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        item.performance === "Excellent"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : item.performance === "Good"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {item.performance}
                    </span>
                  </div>
                  <p className={`text-sm mb-2 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                    Variant: <span className="font-medium">{item.variant}</span>
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Yield: <span className="font-medium">{item.yield.toLocaleString()} kg</span>
                    </span>
                    <span className={`font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}>
                      ₱{item.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rice Variants Performance Table */}
          <div
            className={`${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            } rounded-2xl shadow-lg border p-6 mb-8`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Rice Variants Performance
              </h2>
              <PieChart className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Rice Variant
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Yield (kg)
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Revenue
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Price/kg
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Location
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Season
                    </th>
                    <th className={`text-left py-3 px-4 text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      Health
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockData.riceVariants.map((variant, index) => (
                    <tr
                      key={index}
                      className={`border-b ${isDark ? "border-slate-700 hover:bg-slate-700/50" : "border-slate-100 hover:bg-slate-50"} transition-colors`}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
                        {variant.name}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {variant.yield.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? "text-green-400" : "text-green-600"}`}>
                        ₱{variant.revenue.toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        ₱{variant.pricePerKg}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {variant.location}
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {variant.season}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                              style={{ width: `${variant.health}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                            {variant.health}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Insights */}
          <div
            className={`${
              isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
            } rounded-2xl shadow-lg border p-6 mb-8`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                Actionable Insights & Recommendations
              </h2>
              <AlertCircle className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
            </div>
            <div className="space-y-3">
              {mockData.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    isDark ? "bg-slate-700/50 border-slate-600" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      insight.priority === "high"
                        ? "bg-red-100 dark:bg-red-900/30"
                        : insight.priority === "medium"
                        ? "bg-yellow-100 dark:bg-yellow-900/30"
                        : "bg-blue-100 dark:bg-blue-900/30"
                    }`}
                  >
                    {insight.type === "recommendation" ? (
                      <CheckCircle2 className={`w-4 h-4 ${
                        insight.priority === "high" ? "text-red-600 dark:text-red-400" :
                        insight.priority === "medium" ? "text-yellow-600 dark:text-yellow-400" :
                        "text-blue-600 dark:text-blue-400"
                      }`} />
                    ) : (
                      <AlertCircle className={`w-4 h-4 ${
                        insight.priority === "high" ? "text-red-600 dark:text-red-400" :
                        insight.priority === "medium" ? "text-yellow-600 dark:text-yellow-400" :
                        "text-blue-600 dark:text-blue-400"
                      }`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`${isDark ? "text-slate-300" : "text-slate-700"}`}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Field Distribution and Weather */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field Distribution */}
            <div
              className={`${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              } rounded-2xl shadow-lg border p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Field Distribution
                </h2>
                <Calendar className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
              </div>
              <div className="space-y-4">
                {mockData.fieldDistribution.map((field, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      isDark
                        ? "bg-slate-700/50 border-slate-600"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {field.name}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          field.status === "Harvesting"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : field.status === "Growing"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {field.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                          Variant: <span className="font-medium">{field.variant}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                          Area: <span className="font-medium">{field.area} ha</span>
                        </span>
                        <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                          Price: <span className="font-medium text-green-600">₱{field.marketPrice}/kg</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {field.location}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather Widget */}
            <div
              className={`${
                isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
              } rounded-2xl shadow-lg border p-6`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                  Localized Weather Conditions
                </h2>
                <Sun className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-600"}`} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Temperature</p>
                    <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {mockData.weatherData.temperature}°C
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Humidity</p>
                    <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {mockData.weatherData.humidity}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Rainfall</p>
                    <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {mockData.weatherData.rainfall}mm
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/30 rounded-lg flex items-center justify-center">
                    <Wind className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Wind Speed</p>
                    <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      {mockData.weatherData.windSpeed} km/h
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  5-Day Forecast
                </h3>
                <div className="space-y-2">
                  {mockData.weatherData.forecast.map((day, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{day.icon}</span>
                        <span className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          {day.day}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                          {day.condition}
                        </span>
                        <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {day.temp}°C
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
