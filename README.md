# 🚗 Desktop Drifter

A fun desktop toy where you can drive a car around your screen, treating windows and custom obstacles as barriers!

## 🎮 How to Play

### Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Game**
   ```bash
   npm start
   ```

The game will launch as a transparent overlay on your desktop. You'll see a small car icon appear in your menu bar (system tray).

---

## 🎯 Game Modes

### 🏗️ Edit Mode - Create Your Track

**Toggle:** `Cmd + Shift + E` (or click "Edit Obstacles" in the menu bar)

In Edit Mode, you can create custom obstacles for your car to navigate around:

- **Click and drag** anywhere on the screen to draw rectangular obstacles
- Obstacles appear as **red semi-transparent boxes**
- Release the mouse to place the obstacle
- All obstacles are automatically saved
- **Delete Obstacles**: Click the red "X" to remove an obstacle.

---

### 🏎️ Driving Mode - Race Around!

**Toggle:** `Cmd + Shift + D` (or click "Start Driving" in the menu bar)

Once you've created your track, it's time to drive!

#### Controls

**Acceleration:**
- `↑` (Up Arrow) or `W` - Accelerate forward
- `↓` (Down Arrow) or `S` - Reverse/Brake

**Steering:**
- `←` (Left Arrow) or `A` - Turn left
- `→` (Right Arrow) or `D` - Turn right
- `Spacebar` - **Drift** (Hold while turning to slide!)

**Garage & Switching:**
- `G` - **Switch Car** (When parked in a garage spot or near another car)

---

## 🚗 The Garage

The game now features a **Parking Lot Garage** in the top-left corner of the screen!

### Available Cars
1. **Red Racer** (Default): Balanced stats. Good for cruising.
2. **Drift King** (Purple): Extreme drift radius, slippery tires, purple smoke.
3. **The Tank** (Blue/Grey): Heavy, slow acceleration, wide tires. Pushes through.
4. **Neon Speedster** (Green): High speed, grippy handling, neon green trails.

### How to Switch Cars
1. Drive your current car to the **Parking Lot** (top-left).
2. Park in an empty spot or near a parked car.
3. Press **`G`** to swap control to the nearest parked car.

---

## 🎨 Visual Features

- **Modular Car System**: 4 distinct vehicle types with unique physics and visuals.
- **Dynamic Effects**: 
    - **Drift Sparks**: Colorful sparks when drifting hard (Purple for Drift King, Green for Speedster).
    - **Tire Marks**: Width and color match the vehicle type.
    - **Headlights**: Soft, realistic glow.
- **Obstacles**: Visible in Edit Mode, invisible in Driving Mode.

---

## 🔧 Menu Bar Controls

Click the car icon in your menu bar to access:

- **Start/Stop Driving** (`Cmd + Shift + D`)
- **Edit Obstacles** (`Cmd + Shift + E`)
- **Quit** - Close the application

---

## 🚀 Quick Start Guide

1. Launch the game: `npm start`
2. Press `Cmd + Shift + E` to enter Edit Mode
3. Draw some obstacles around your windows.
4. Press `Cmd + Shift + D` to start driving.
5. **Try the New Cars**: Drive to the top-left corner and press 'G' near the purple or green car!
6. Have fun! 🎉

---

## ⌨️ Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `Cmd + Shift + D` | Toggle Driving Mode |
| `Cmd + Shift + E` | Toggle Edit Mode |
| `space` | Drift |
| `G` | Switch Car (in Garage) |
| `W / A / S / D` | Drive |

---

## 🎪 Features

- ✨ Transparent overlay - drive on top of your desktop!
- 🚗 **4 Unique Vehicle Classes** (Racer, Drifter, Tank, Speedster)
- 🅿️ **Functional Garage System**
- 🎮 Realistic car physics with momentum and friction
- 🏗️ Custom obstacle creation and editing
- 💾 Automatic save/load of obstacles
- 🎯 Global keyboard shortcuts

---

Enjoy your desktop drifting experience! 🏁
