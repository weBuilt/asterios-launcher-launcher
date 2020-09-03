import {app, BrowserWindow, ipcMain, dialog, IpcMainEvent} from "electron";

const child = require('child_process');
const {autoUpdater} = require('electron-updater');
import * as path from "path";
import fs from "fs";
// import os from "os";

const {v4: uuidv4} = require('uuid');

let selected: string | null
let lastUsed: string | null

const isDev = !(process.env.NODE_ENV === undefined) && (process.env.NODE_ENV.indexOf("dev") !== -1)
const appDataPath = path.resolve(process.env.APPDATA, "aLauncher")
if (!fs.existsSync(appDataPath)) fs.mkdirSync(appDataPath)

const configPath = path.resolve(appDataPath, "config.json");
let config = {
    asteriosPath: undefined as string,
};

class SavedLogin {
    id: string
    name: string
    description: string
    filename: string

    constructor(
        id: string,
        name: string,
        description: string,
        filename: string,
    ) {
        this.id = id
        this.name = name
        this.description = description
        this.filename = filename
    }
}

const savedLoginsPath = path.resolve(appDataPath, "logins.json");
const savedLoginsString =
    fs.existsSync(savedLoginsPath) ? fs.readFileSync(savedLoginsPath, {encoding: "UTF-8"}) : undefined
let savedLogins: SavedLogin[] = [];
if (savedLoginsString) {
    const parsed = JSON.parse(savedLoginsString);
    if (parsed instanceof Array) savedLogins = parsed.map(
        (value, _, __) => {
            return new SavedLogin(value.id, value.name, value.description, value.filename)
        }
    )
}
const configString: string =
    fs.existsSync(configPath) ? fs.readFileSync(configPath, {encoding: "UTF-8"}) : undefined
if (configString) {
    config = JSON.parse(
        configString.toString()
    )
} else {
    console.log("no config file found");
}


let mainWindowId: number;
let asteriosPath: string;
if (config.asteriosPath) asteriosPath = config.asteriosPath as string;

let mainWindow: BrowserWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
        width: 800,
        autoHideMenuBar: (!isDev),
        maximizable: false,
        fullscreenable: false,
        thickFrame: true,
        icon: path.join(__dirname, "../icon.png")
    });
    mainWindowId = mainWindow.id;

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../index.html"));

    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });

    // Open the DevTools.
    if (isDev) mainWindow.webContents.openDevTools();
}

ipcMain.on('app_version', (event) => {
    event.sender.send('app_version', {version: app.getVersion()});
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
    createWindow();

    app.on("activate", () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('open-file-dialog', (event) => {
    const select = dialog.showOpenDialog({
        properties: ['openDirectory', "dontAddToRecent"],
        title: "Select Aterios root folder",
    })
    select.then((files) => {
        if (files && isAsteriosPathCorrect(files.filePaths[0])) {
            asteriosPath = files.filePaths[0];
            saveConfig();
            event.sender.send('selected-directory', files.filePaths[0]);
        }
    })
})
ipcMain.on('synchronous-message', (event, args) => {
    let command = args.toString()

    if (args instanceof Array) command = args[0];
    switch (command) {
        case "asterios-path-specified":
            checkAsteriosPath(event)
            break;
        case "get-logins":
            returnLogins(event)
            break;
        case "save-new-login":
            saveNewLogin(args[1], args[2], event)
            break;
        case "delete":
            deleteLogin(selected, event);
            break;
    }
})
ipcMain.on("asynchronous-message", (event, args) => {
    let command = args.toString()
    if (args instanceof Array) command = args[0];
    console.log("async command", command)
    switch (command) {
        case "launch":
            useSavedLogin(args[1]);
            break;
        case "launch-current":
            launch();
            break;
        case "set":
            setSelected(args[1]);
            break;
    }
})

function findLogin(id: string): SavedLogin | null {
    return savedLogins.find((v, _, __) => {
        return (v.id === id)
    })
}

function deleteLogin(id: string, event: IpcMainEvent) {
    savedLogins = savedLogins.filter((l) => {
        return l.id !== id
    })
    rewriteLogins();
    if (event) event.returnValue = id;
}

function isAsteriosPathCorrect(astPath: string): boolean {
    const stat = fs.statSync(astPath)
    return stat.isDirectory() && fs.existsSync(path.resolve(astPath, "asterios"))
}

function setSelected(id: string) {
    selected = id;
    console.log("selected", selected);
}

function checkAsteriosPath(event: IpcMainEvent) {
    if (asteriosPath && isAsteriosPathCorrect(asteriosPath)) {
        event.returnValue = ["asterios-path-specified", asteriosPath];
    } else
        event.returnValue = ["asterios-path-not-specified"]
}

function saveConfig() {
    config.asteriosPath = asteriosPath;
    fs.writeFileSync(configPath, JSON.stringify(config, null, "  "));
}

const targetIniName = () => path.resolve(asteriosPath, "asterios", "AsteriosGame.ini")
const launcherPath = () => path.resolve(asteriosPath, "Asterios.exe")

function useSavedLogin(savedLoginId: string) {
    selected = savedLoginId;
    launch();
}

function launch() {
    if (selected && (lastUsed !== selected)) {
        const login = findLogin(selected)
        if (login)
            fs.copyFileSync(resolveLoginPath(login.filename), targetIniName())
    }
    lastUsed = selected;
    console.log("executing", launcherPath())
    child.execFile(launcherPath(), ["/autoplay"])
}

function rewriteLogins() {
    fs.writeFileSync(savedLoginsPath, JSON.stringify(savedLogins, null, "  "))
}

function saveNewLogin(name: string, description: string, event: IpcMainEvent) {
    const randomId = uuidv4() as string
    const newLogin = new SavedLogin(randomId, name, description, randomId + ".ini")
    fs.copyFileSync(targetIniName(), resolveLoginPath(newLogin.filename))
    console.log("saved", newLogin)
    savedLogins.push(newLogin)
    rewriteLogins()
    const saved = fs.existsSync(resolveLoginPath(newLogin.filename))
    console.log("saved", saved)
    event.returnValue = saved
}

function resolveLoginPath(loginFilename: string): string {
    const loginsDir = path.resolve(asteriosPath, "asterios", "logins")
    if (!fs.existsSync(loginsDir))
        fs.mkdirSync(loginsDir)
    return path.resolve(asteriosPath, "asterios", "logins", loginFilename);
}

function returnLogins(event: IpcMainEvent) {
    if (savedLogins.length === 0)
        event.returnValue = ["none"]
    else event.returnValue = ["logins", JSON.stringify(savedLogins, null, "  ")]
}

autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded');
});
ipcMain.on('restart_app', () => {
    autoUpdater.quitAndInstall();
});