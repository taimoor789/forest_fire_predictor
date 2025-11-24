# 🔥 Forest Fire Risk Predictor

> **Real-time wildfire risk monitoring across Canada using the Canadian Fire Weather Index System**

An interactive web application that provides hourly fire risk predictions for over 15,000 locations nationwide, helping Canadians stay informed about wildfire dangers in their area.

---

## 📊 Overview

The Forest Fire Risk Predictor is a production-ready Next.js application that visualizes fire risk data on an interactive map, powered by Environment Canada's official Fire Weather Index algorithm.

### **Key Statistics**
- 🗺️ **15,000+** grid cells monitored across Canada
- 🌡️ **38** weather stations providing real-time data
- ⏱️ **Hourly** automatic updates
- 📍 **30-day** historical weather accumulation
- 🎯 **95%** model confidence

---

## ✨ Features

### 🗺️ **Interactive Map Visualization**

#### **Markers Mode**
- 38 weather stations with aggregated risk data
- Color-coded markers (green → red) based on fire danger
- Click markers for detailed station information:
  - Temperature, humidity, wind speed
  - Fire Weather Index values (FFMC, DMC, DC, ISI, BUI, FWI)
  - Danger class and risk percentage

#### **Heatmap Mode**
- 15,000+ grid cells showing fire risk density
- Smooth gradient visualization (green → yellow → red)
- Regional risk patterns at a glance

### 📈 **Risk Dashboard**

#### **Statistics Panel**
- **Very High** (≥80%) - Extreme fire danger
- **High** (60-80%) - High fire risk
- **Medium** (40-60%) - Moderate risk
- **Low** (<40%) - Minimal risk

#### **High Risk Alerts**
- Top 3 highest-risk areas displayed
- Real-time risk percentages
- Provincial location information

#### **National Overview**
- Total grid cells monitored
- Active weather stations count
- Percentage breakdowns by risk level

### 📍 **Smart Geolocation**

#### **Auto-Detection**
- Automatic location detection (with user permission)
- 7-day location caching (no repeated requests)
- Fallback to coordinates if geocoding fails

#### **Nearest Stations**
- Shows 2 closest weather stations
- Distance in kilometers
- Current risk level for each station

### 🔗 **Official Resources**
Direct links to:
- Canadian Wildland Fire Information System
- Natural Resources Canada
- Government of Canada wildfire resources
- Provincial fire agencies

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Framework** | Next.js 15 | React framework with SSR |
| **Language** | TypeScript | Type safety and developer experience |
| **Mapping** | Leaflet | Interactive map visualization |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **State Management** | React Hooks | Local state management |
| **API Integration** | Fetch API | Backend communication |
| **Testing** | Jest | Unit and integration testing |

---

## 🌐 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | Latest | ✅ Full |
| Firefox | Latest | ✅ Full |
| Safari | Latest | ✅ Full |
| Edge | Latest | ✅ Full |
| Mobile Safari | iOS 13+ | ✅ Full |
| Chrome Mobile | Latest | ✅ Full |

---

## 🙏 Acknowledgments

- **Environment and Climate Change Canada** - Fire Weather Index algorithm
- **Natural Resources Canada** - Wildfire data and research
- **OpenWeather API** - Real-time weather data
- **OpenStreetMap Nominatim** - Geocoding services

---

<div align="center">

**Made with ❤️ for Canadian communities**

![Fire Risk](https://img.shields.io/badge/Fire%20Risk-Monitoring-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production-success?style=for-the-badge)
![Updates](https://img.shields.io/badge/Updates-Hourly-blue?style=for-the-badge)

</div>