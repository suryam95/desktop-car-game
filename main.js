const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;
let isDriving = false;
let isEditing = false;

// Path to store obstacles data
const DATA_PATH = path.join(app.getPath('userData'), 'obstacles.json');
console.log('Starting app...');

function createWindow() {
  console.log('Creating window...');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;


  mainWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Ensure it stays on top (level: screen-saver is very high)
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Initial state: click-through
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Hide from dock to be less intrusive (optional, maybe keep for now)
  // app.dock.hide();
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png'); // We'll need a placeholder icon
  // For now, just use a text label if icon fails or create a simple empty image later
  // If no icon is found, it might throw or show empty. 
  // Let's assume we'll create a simple 16x16 png or just proceed.

  tray = new Tray(path.join(__dirname, 'assets', 'iconTemplate.png'));

  updateTrayMenu();
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isDriving ? 'Stop Driving (Cmd+Shift+D)' : 'Start Driving (Cmd+Shift+D)',
      click: toggleDriving
    },
    {
      label: isEditing ? 'Stop Editing (Cmd+Shift+E)' : 'Edit Obstacles (Cmd+Shift+E)',
      click: toggleEditing
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Desktop Drifter');
  tray.setContextMenu(contextMenu);
}

function toggleDriving() {
  isDriving = !isDriving;
  // If we start driving, ensure editing is off? Or can they coexist?
  // Let's say mutually exclusive for simplicity or driving pauses when editing.
  if (isDriving) isEditing = false;

  updateState();
}

function toggleEditing() {
  isEditing = !isEditing;
  if (isEditing) isDriving = false;

  updateState();
}

function updateState() {
  updateTrayMenu();

  // Send state to renderer
  mainWindow.webContents.send('state-update', { isDriving, isEditing });

  // Window behavior
  if (isEditing) {
    // In edit mode, we need to capture mouse events to draw boxes
    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.focus();
  } else {
    // In driving or idle mode, we want click-through
    // BUT, if we are driving, we might need keyboard focus?
    // Actually, for global shortcuts we don't need focus, but for WASD we do need window focus if we use standard window events.
    // However, if we want to drive AND click other windows, we need to use global shortcuts for driving too?
    // The user said: "if it's on, it overlays ALL desktop components... i should also be able to toggle boxes on and off."
    // Usually for a "Desktop Toy", if you want to drive, you focus the toy. If you want to work, you stop driving.
    // Let's assume: Driving = Window Focused, Mouse Ignored (so you can see cursor but clicks might pass through? No, if focused, clicks go to app).
    // Actually, if we want to drive ON TOP of windows, we probably want the app to be focused to receive keyboard input.

    if (isDriving) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.focus();
    } else {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }
  }
}

app.whenReady().then(() => {
  console.log('App ready');
  createWindow();
  console.log('Window created');
  // createTray(); // We need an icon first, skipping for now to avoid crash
  createTray();
  console.log('Tray created');

  // Register Global Shortcuts
  globalShortcut.register('Command+Shift+D', () => {
    toggleDriving();
  });

  globalShortcut.register('Command+Shift+E', () => {
    toggleEditing();
  });

  // Load obstacles
  ipcMain.handle('load-obstacles', async () => {
    try {
      if (fs.existsSync(DATA_PATH)) {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load obstacles', e);
    }
    return [];
  });

  ipcMain.handle('save-obstacles', async (event, obstacles) => {
    try {
      fs.writeFileSync(DATA_PATH, JSON.stringify(obstacles));
      return true;
    } catch (e) {
      console.error('Failed to save obstacles', e);
      return false;
    }
  });

  // Forward mouse event state changes from renderer if needed
  ipcMain.on('set-ignore-mouse', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setIgnoreMouseEvents(ignore, options);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Cleanup shortcuts
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
