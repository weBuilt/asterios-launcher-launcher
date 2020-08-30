import {app, BrowserWindow, ipcMain, dialog, IpcMainEvent} from "electron";

const child = require('child_process');
import * as path from "path";
// import os from "os";
import fs from "fs";

const isDev = !(process.env.NODE_ENV === undefined) && (process.env.NODE_ENV.indexOf("dev") !== -1)

const configPath = path.resolve(__dirname, "..", "config.json");
let config = {
    asteriosPath: undefined as string,
};

class SavedLogin {
    name: string
    description: string
    filename: string

    constructor(
        name: string,
        description: string,
        filename: string,
    ) {
        this.name = name
        this.description = description
        this.filename = filename
    }
}

const savedLoginsPath = path.resolve(__dirname, "..", "testLogins.json");
const savedLoginsString = fs.readFileSync(savedLoginsPath, {encoding: "UTF-8"})
let savedLogins: SavedLogin[] = [];
if (savedLoginsString) {
    const parsed = JSON.parse(savedLoginsString);
    if (parsed instanceof Array) savedLogins = parsed.map(
        (value, _, __) => {
            return new SavedLogin(value.name, value.description, value.filename)
        }
    )
}
const configString: string = fs.readFileSync(configPath, {encoding: "UTF-8"})
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

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: true,
        },
        width: 800,
    });
    mainWindowId = mainWindow.id;

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "../index.html"));

    // Open the DevTools.
    if (isDev) mainWindow.webContents.openDevTools();
}

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
    }
})
ipcMain.on("asynchronous-message", (event, args) => {
    let command = args.toString()
    if (args instanceof Array) command = args[0];
    console.log("async command", command)
    switch (command) {
        case "launch":
            const loginToUse = savedLogins.find((v, _, __) => {
                return v.name === args[1]
            })
            useSavedLogin(loginToUse)
            break;
    }
})

function isAsteriosPathCorrect(astPath: string): boolean {
    const stat = fs.statSync(astPath)
    return stat.isDirectory() && fs.existsSync(path.resolve(astPath, "asterios"))
}

function checkAsteriosPath(event: IpcMainEvent) {
    if (asteriosPath && isAsteriosPathCorrect(asteriosPath)) {
        event.returnValue = ["asterios-path-specified", asteriosPath];
    } else
        event.returnValue = ["asterios-path-not-specified"]
}

function saveConfig() {
    config.asteriosPath = asteriosPath;
    fs.writeFileSync(configPath, JSON.stringify(config));
}

const targetIniName = path.resolve(asteriosPath, "asterios", "AsteriosGame.ini")
const launcherPath = path.resolve(asteriosPath, "Asterios.exe")

function useSavedLogin(savedLogin: SavedLogin) {
    if (savedLogin) fs.copyFileSync(resolveLoginPath(savedLogin.filename), targetIniName)
    console.log("used", savedLogin.name)
    child.execFile(launcherPath, ["/autoplay"])
}

function saveNewLogin(name: string, description: string) {
    const newLogin = new SavedLogin(name, description, name + ".ini")
    fs.copyFileSync(targetIniName, resolveLoginPath(newLogin.filename))
    console.log("saved", newLogin)
    savedLogins.push(newLogin)
    fs.writeFileSync(savedLoginsPath, JSON.stringify(savedLogins))
}

function resolveLoginPath(loginFilename: string): string {
    return path.resolve(asteriosPath, "asterios", "logins", loginFilename);
}

function returnLogins(event: IpcMainEvent) {
    if (savedLogins.length === 0)
        event.returnValue = ["none"]
    else event.returnValue = ["logins", JSON.stringify(savedLogins)]
}