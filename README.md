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

**Tips:**
- Draw boxes around your open windows to create a realistic track
- Create challenging mazes and courses
- Obstacles must be at least 5x5 pixels to be saved

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

**Physics:**
- The car has realistic momentum and friction
- You can only steer when the car is moving
- Steering direction reverses when driving in reverse
- The car will bounce back when hitting obstacles

---

## 🎨 Visual Features

### The Car
- **Modern Airbnb-Style Design**
- **Steerable Wheels**: Front wheels rotate when turning.
- **Dynamic Effects**: Smoke and tire tracks appear based on driving style.
- Visible in both Edit and Driving modes

### Obstacles
- **Visible** in Edit Mode (red semi-transparent boxes)
- **Invisible** in Driving Mode (but still solid!)
- Persist between sessions

---

## 🔧 Menu Bar Controls

Click the car icon in your menu bar to access:

- **Start/Stop Driving** (`Cmd + Shift + D`)
- **Edit Obstacles** (`Cmd + Shift + E`)
- **Quit** - Close the application

---

## 💡 Tips & Tricks

1. **Create a Desktop Racetrack:** Arrange your windows, then use Edit Mode to trace around them
2. **Challenge Yourself:** Create narrow corridors and tight turns
3. **Practice Drifting:** Use the momentum physics to slide around corners
4. **Screen Boundaries:** The car can't leave the screen edges
5. **Mutually Exclusive Modes:** You can't drive and edit at the same time

---

## 🗂️ Data Storage

Your obstacles are automatically saved to:
```
~/Library/Application Support/antigravity/obstacles.json
```

This means your custom tracks persist between game sessions!

---

## 🚀 Quick Start Guide

1. Launch the game: `npm start`
2. Press `Cmd + Shift + E` to enter Edit Mode
3. Draw some obstacles by clicking and dragging
4. Press `Cmd + Shift + E` again to exit Edit Mode
5. Press `Cmd + Shift + D` to start driving
6. Use arrow keys or WASD to drive around!
7. Have fun! 🎉

---

## ⌨️ Keyboard Shortcuts Summary

| Shortcut | Action |
|----------|--------|
| `Cmd + Shift + D` | Toggle Driving Mode |
| `Cmd + Shift + E` | Toggle Edit Mode |
| `↑` or `W` | Accelerate |
| `↓` or `S` | Reverse/Brake |
| `←` or `A` | Turn Left |
| `→` or `D` | Turn Right |
| `Spacebar` | **Drift** |

---

## 🎪 Features

- ✨ Transparent overlay - drive on top of your desktop!
- 🎮 Realistic car physics with momentum and friction
- 🏗️ Custom obstacle creation and editing
- 💾 Automatic save/load of obstacles
- 🖱️ Click-through when not in use
- 🎯 Always-on-top overlay
- ⌨️ Global keyboard shortcuts

---

Enjoy your desktop drifting experience! 🏁

## ✨ New Updates
*   **Airbnb-Style Redesign**: A fresh, modern, top-down car icon.
*   **Drift Mechanics**: Hold `Spacebar` to drift around corners!
*   **Dynamic Smoke & Tire Marks**:
    *   Solid skid marks when drifting.
    *   Subtle tire smoke from rear wheels.
*   **Obstacle Deletion**: Delete obstacles easily with the red "X" button in Edit Mode.
*   **Hard Collisions**: Hitting a wall now stops the car instantly.
*   **Polished Physics**: Smoother, more relaxing driving feel.
